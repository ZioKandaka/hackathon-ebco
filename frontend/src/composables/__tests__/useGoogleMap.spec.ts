import { describe, it, expect } from 'vitest';
import { useGoogleMap } from '../useGoogleMap';
import { googleMapService } from '../../services/google-map.service';

describe('useGoogleMap', () => {
  it('should initialize with default states', () => {
    const { isLoading, mapError, isGeolocationGranted } = useGoogleMap();

    expect(isLoading.value).toBe(false);
    expect(mapError.value).toBeNull();
    expect(isGeolocationGranted.value).toBe(false);
  });

  describe('googleMapService heatmap layer management', () => {
    it('should provide removeHeatmap and renderHeatmap methods on GoogleMapService', () => {
      expect(typeof googleMapService.renderHeatmap).toBe('function');
      expect(typeof googleMapService.removeHeatmap).toBe('function');
    });

    it('should safely execute removeHeatmap when no layer is active', () => {
      expect(() => googleMapService.removeHeatmap()).not.toThrow();
    });
  });

  describe('googleMapService catchment circle layer management', () => {
    it('should provide removeCatchmentCircle and renderCatchmentCircle methods', () => {
      expect(typeof googleMapService.renderCatchmentCircle).toBe('function');
      expect(typeof googleMapService.removeCatchmentCircle).toBe('function');
    });

    it('should safely execute removeCatchmentCircle when no circle is active', () => {
      expect(() => googleMapService.removeCatchmentCircle()).not.toThrow();
    });
  });

  describe('googleMapService isochrone polygon layer management', () => {
    it('should provide removeIsochronePolygon and renderIsochronePolygon methods', () => {
      expect(typeof googleMapService.renderIsochronePolygon).toBe('function');
      expect(typeof googleMapService.removeIsochronePolygon).toBe('function');
    });

    it('should safely execute removeIsochronePolygon when no polygon is active', () => {
      expect(() => googleMapService.removeIsochronePolygon()).not.toThrow();
    });
  });

  describe('googleMapService map centering management', () => {
    it('should provide setCenterAndZoom method on GoogleMapService', () => {
      expect(typeof googleMapService.setCenterAndZoom).toBe('function');
    });

    it('should safely execute setCenterAndZoom when map is null', () => {
      expect(() => googleMapService.setCenterAndZoom({ lat: -6.2088, lng: 106.8456 }, 17)).not.toThrow();
    });
  });
});
