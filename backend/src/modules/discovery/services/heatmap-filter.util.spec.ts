import { buildHeatmapFilterSql, describeHeatmapFilter, validateHeatmapFilters } from './heatmap-filter.util';

describe('heatmap-filter.util', () => {
  describe('validateHeatmapFilters', () => {
    it('should accept a valid numeric filter on a whitelisted column', () => {
      const { valid, dropped } = validateHeatmapFilters([{ column: 'rating', operator: 'lt', value: '4.0' }]);
      expect(valid).toEqual([{ column: 'rating', operator: 'lt', value: 4.0 }]);
      expect(dropped).toEqual([]);
    });

    it('should accept a valid enum filter on business_status, normalized to uppercase', () => {
      const { valid, dropped } = validateHeatmapFilters([
        { column: 'business_status', operator: 'eq', value: 'operational' },
      ]);
      expect(valid).toEqual([{ column: 'business_status', operator: 'eq', value: 'OPERATIONAL' }]);
      expect(dropped).toEqual([]);
    });

    it('should drop a filter on a column that is not whitelisted (e.g. fabricated "profit")', () => {
      const { valid, dropped } = validateHeatmapFilters([
        { column: 'profit', operator: 'gt', value: '1000000000' },
      ]);
      expect(valid).toEqual([]);
      expect(dropped).toEqual([{ column: 'profit', operator: 'gt', value: '1000000000' }]);
    });

    it('should drop a filter using an operator not supported for that column', () => {
      const { valid, dropped } = validateHeatmapFilters([
        { column: 'business_status', operator: 'lt', value: 'OPERATIONAL' },
      ]);
      expect(valid).toEqual([]);
      expect(dropped.length).toBe(1);
    });

    it('should drop an enum filter whose value is not one of the real allowed values', () => {
      const { valid, dropped } = validateHeatmapFilters([
        { column: 'business_status', operator: 'eq', value: 'PERMANENTLY_OPEN' },
      ]);
      expect(valid).toEqual([]);
      expect(dropped.length).toBe(1);
    });

    it('should drop a numeric filter with a non-numeric value', () => {
      const { valid, dropped } = validateHeatmapFilters([{ column: 'rating', operator: 'lt', value: 'great' }]);
      expect(valid).toEqual([]);
      expect(dropped.length).toBe(1);
    });

    it('should return empty arrays when no filters are given', () => {
      expect(validateHeatmapFilters()).toEqual({ valid: [], dropped: [] });
      expect(validateHeatmapFilters([])).toEqual({ valid: [], dropped: [] });
    });
  });

  describe('buildHeatmapFilterSql', () => {
    it('should build parameterized AND clauses for each filter', () => {
      const params: Record<string, any> = {};
      const sql = buildHeatmapFilterSql(
        [
          { column: 'rating', operator: 'lt', value: 4.0 },
          { column: 'business_status', operator: 'eq', value: 'OPERATIONAL' },
        ],
        params,
      );
      expect(sql).toBe('AND rating < @filterVal0 AND business_status = @filterVal1');
      expect(params).toEqual({ filterVal0: 4.0, filterVal1: 'OPERATIONAL' });
    });
  });

  describe('describeHeatmapFilter', () => {
    it('should produce a human-readable description', () => {
      expect(describeHeatmapFilter({ column: 'rating', operator: 'lt', value: 4.0 })).toBe('rating below 4');
    });
  });
});
