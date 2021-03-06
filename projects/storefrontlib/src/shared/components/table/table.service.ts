import { Injectable, isDevMode } from '@angular/core';
import { BREAKPOINT } from '../../../layout/config/layout-config';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { BreakpointService } from '../../../layout/breakpoint/breakpoint.service';
import { TableConfig } from './config/table.config';
import { TableStructure, TableStructureConfiguration } from './table.model';

/**
 * Responsive table service.
 *
 * The `TableService` is used to generate a `TableStructure` based on configuration. The table
 * structure configuration allows for breakpoint specific configuration, so that the table
 * experience can be differentiated various screen sizes.
 *
 * The table structure configuration is driven by a table type. The various supported
 * table types are exposed in feature libraries.
 *
 * If there is no table configuration for the given type found, a table header structure
 * is generated based on the actual data or randomly (in case no data is passed in) by
 * generating 5 headers. In case of a generated header, we warn the developer in devMode that
 * there is no configuration available.
 */
@Injectable({
  providedIn: 'root',
})
export class TableService {
  constructor(
    protected breakpointService: BreakpointService,
    protected config: TableConfig
  ) {}

  /**
   * Builds the table structure. The table structure can be created by the help of
   * the `tableType`. The `tableType` can be used in the configuration `TableConfig`,
   * so that the table headers can be defined.
   */
  buildStructure(
    tableType: string,
    data$?: Observable<any>
  ): Observable<TableStructure> {
    if (this.hasTableConfig(tableType)) {
      return this.buildStructureFromConfig(tableType);
    } else {
      if (data$) {
        return this.buildStructureFromData(tableType, data$);
      } else {
        return this.buildRandomStructure(tableType);
      }
    }
  }

  /**
   * Returns the table structure by configuration. The configuration can be
   * breakpoint-driven, which means that an alternative header structure can
   * be created per screen size.
   *
   * The breakpoint is resolved by teh `BreakpointService`.
   */
  protected buildStructureFromConfig(type: string): Observable<TableStructure> {
    return this.breakpointService.breakpoint$.pipe(
      map((breakpoint) => ({ ...this.getTableConfig(type, breakpoint), type }))
    );
  }

  /**
   * This method generates a table structure by the help of the first data row.
   */
  protected buildStructureFromData(
    type: string,
    data$: Observable<any>
  ): Observable<TableStructure> {
    this.warn(
      `No table configuration found to render table with type "${type}". The table header for "${type}" is generated by the help of the first data item`
    );
    return data$.pipe(
      map((data: any[]) => {
        const headers = Object.keys(data?.[0]).map((key) => ({
          key,
          label: key,
        }));
        return {
          type: type,
          headers,
        } as TableStructure;
      })
    );
  }

  /**
   * As a last resort, the table structure is randomly created. We add 5 unknown headers
   * and use the `hideHeader` to avoid the unknown headers to be rendered.
   */
  protected buildRandomStructure(type: string): Observable<TableStructure> {
    this.warn(
      `No data available for "${type}", a random structure is generated (with hidden table headers).`
    );

    return of({
      type,
      headers: [
        { key: 'unknown' },
        { key: 'unknown' },
        { key: 'unknown' },
        { key: 'unknown' },
        { key: 'unknown' },
      ],
      hideHeader: true,
    });
  }

  /**
   * Finds the best applicable table configuration for the given type
   * and breakpoint. If there is no configuration available for the breakpoint,
   * the best match will be returned, using mobile first approach.
   *
   * If there is no match for any breakpoint, the fallback is a configuration
   * without the notion of a breakpoint. Otherwise we fallback to the first
   * available config.
   */
  protected getTableConfig(
    type: string,
    breakpoint: BREAKPOINT
  ): TableStructureConfiguration {
    const tableConfig = this.config.table[type];

    // find all relevant breakpoints
    const current = this.breakpointService.breakpoints.indexOf(breakpoint);
    const relevant = this.breakpointService.breakpoints
      .slice(0, current + 1)
      .reverse();

    const bestMatch: BREAKPOINT = relevant.find(
      (br) => !!tableConfig.find((structure) => structure.breakpoint === br)
    );

    return bestMatch
      ? tableConfig.find((config) => config.breakpoint === bestMatch)
      : tableConfig.find((structure) => !structure.breakpoint) ||
          tableConfig[0];
  }

  protected hasTableConfig(tableType: string): boolean {
    return !!this.config.table?.[tableType];
  }

  /**
   * Prints a convenient message in the console to increase developer experience.
   */
  private warn(message) {
    if (isDevMode) {
      console.warn(message);
    }
  }
}
