// Fixed whitelist of poi_gold columns that are actually populated and meaningful to filter on.
// customer_type / flag_rekanan are excluded: every row currently holds the same placeholder
// value ("To be confirmed"), so filtering on them would be meaningless.
export type HeatmapFilterColumnType = 'NUMBER' | 'STRING';

export interface HeatmapFilterColumnSpec {
  type: HeatmapFilterColumnType;
  operators: string[];
  allowedValues?: string[];
  label: string;
}

export const HEATMAP_FILTERABLE_COLUMNS: Record<string, HeatmapFilterColumnSpec> = {
  rating: { type: 'NUMBER', operators: ['lt', 'lte', 'gt', 'gte', 'eq'], label: 'rating' },
  user_rating_count: { type: 'NUMBER', operators: ['lt', 'lte', 'gt', 'gte', 'eq'], label: 'review count' },
  business_status: {
    type: 'STRING',
    operators: ['eq', 'neq'],
    allowedValues: ['OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY'],
    label: 'business status',
  },
};

export interface RawHeatmapFilter {
  column: string;
  operator: string;
  value: string;
}

export interface ValidatedHeatmapFilter {
  column: string;
  operator: string;
  value: string | number;
}

const OPERATOR_SQL: Record<string, string> = {
  lt: '<',
  lte: '<=',
  gt: '>',
  gte: '>=',
  eq: '=',
  neq: '!=',
};

/**
 * Filters out anything the model couldn't validly map to a real, populated column —
 * never silently reinterprets an unsupported request as something else.
 */
export function validateHeatmapFilters(raw?: RawHeatmapFilter[] | null): {
  valid: ValidatedHeatmapFilter[];
  dropped: RawHeatmapFilter[];
} {
  const valid: ValidatedHeatmapFilter[] = [];
  const dropped: RawHeatmapFilter[] = [];

  for (const f of raw || []) {
    const spec = HEATMAP_FILTERABLE_COLUMNS[f?.column];
    if (!spec || !spec.operators.includes(f.operator)) {
      dropped.push(f);
      continue;
    }

    if (spec.type === 'NUMBER') {
      const num = Number(f.value);
      if (Number.isNaN(num)) {
        dropped.push(f);
        continue;
      }
      valid.push({ column: f.column, operator: f.operator, value: num });
    } else {
      const normalized = String(f.value).toUpperCase().trim();
      if (spec.allowedValues && !spec.allowedValues.includes(normalized)) {
        dropped.push(f);
        continue;
      }
      valid.push({ column: f.column, operator: f.operator, value: normalized });
    }
  }

  return { valid, dropped };
}

export function buildHeatmapFilterSql(
  filters: ValidatedHeatmapFilter[],
  params: Record<string, any>,
): string {
  return filters
    .map((f, idx) => {
      const paramName = `filterVal${idx}`;
      params[paramName] = f.value;
      return `AND ${f.column} ${OPERATOR_SQL[f.operator]} @${paramName}`;
    })
    .join(' ');
}

export function describeHeatmapFilter(f: ValidatedHeatmapFilter): string {
  const spec = HEATMAP_FILTERABLE_COLUMNS[f.column];
  const opText: Record<string, string> = {
    lt: 'below',
    lte: 'at or below',
    gt: 'above',
    gte: 'at or above',
    eq: 'equal to',
    neq: 'not equal to',
  };
  return `${spec.label} ${opText[f.operator]} ${f.value}`;
}
