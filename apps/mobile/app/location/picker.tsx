import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  TouchableOpacity, FlatList, ActivityIndicator, Keyboard, Platform,
} from 'react-native';
// react-native-maps requires a native build — guard against missing native module
// (e.g. Expo Go simulator, or first-run before native build)
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
let PROVIDER_DEFAULT: any = null;
let mapsAvailable = false;
try {
  const Maps = require('react-native-maps');
  MapView        = Maps.default;
  Marker         = Maps.Marker;
  PROVIDER_GOOGLE   = Maps.PROVIDER_GOOGLE;
  PROVIDER_DEFAULT  = Maps.PROVIDER_DEFAULT;
  mapsAvailable  = true;
} catch { /* native module unavailable */ }
type MapPressEvent = any;
type Region = {
  latitude: number; longitude: number;
  latitudeDelta: number; longitudeDelta: number;
};
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { RADIUS, SPACING } from '../../constants/theme';

interface Place { display_name: string; lat: string; lon: string; }

const NOMINATIM = 'https://nominatim.openstreetmap.org';

function shortName(p: Place) { return p.display_name.split(',').slice(0, 2).join(', ').trim(); }
function subName(p: Place)   { return p.display_name.split(',').slice(2, 5).join(', ').trim(); }

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'OurplanApp/1.0' } }
    );
    const data = await res.json();
    if (data?.display_name) {
      return data.display_name.split(',').slice(0, 2).join(', ').trim();
    }
  } catch {}
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

export default function LocationPickerScreen() {
  const { theme: t } = useThemeStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';
  const mapRef = useRef<any>(null);

  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pinLabel, setPinLabel]   = useState('');
  const [pinCoord, setPinCoord]   = useState<{ lat: number; lon: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [region, setRegion]       = useState<Region>({
    latitude: 13.7563, longitude: 100.5018,
    latitudeDelta: 0.05, longitudeDelta: 0.05,
  });

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request location on mount and center map
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const r: Region = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          };
          setRegion(r);
          mapRef.current?.animateToRegion(r, 600);
        }
      } catch {
        // Location unavailable — keep default Bangkok center
      }
    })();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en,th', 'User-Agent': 'OurplanApp/1.0' } });
        setResults(await res.json());
      } catch { setResults([]); }
      finally { setIsSearching(false); }
    }, 450);
  }, [query]);

  function goToMyLocation() {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        const r: Region = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        mapRef.current?.animateToRegion(r, 600);
        placePin(loc.coords.latitude, loc.coords.longitude);
      } catch {
        // Location unavailable
      }
    })();
  }

  async function placePin(lat: number, lon: number) {
    setPinCoord({ lat, lon });
    setPinLabel('');
    setIsGeocoding(true);
    const label = await reverseGeocode(lat, lon);
    setPinLabel(label);
    setIsGeocoding(false);
  }

  function handleMapPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    Keyboard.dismiss();
    setQuery('');
    setResults([]);
    placePin(latitude, longitude);
  }

  function selectSearchResult(place: Place) {
    Keyboard.dismiss();
    setQuery(shortName(place));
    setResults([]);
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const r: Region = { latitude: lat, longitude: lon, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    mapRef.current?.animateToRegion(r, 400);
    placePin(lat, lon);
  }

  function handleConfirm() {
    if (!pinCoord || !pinLabel) return;
    router.back();
    setTimeout(() => router.setParams({ pickedLocation: pinLabel }), 80);
  }

  const hasPin = !!pinCoord;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.cancelBtn, { color: t.accent }]}>{isThai ? 'ยกเลิก' : 'Cancel'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>{isThai ? 'เลือกสถานที่' : 'Pick Location'}</Text>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!hasPin || isGeocoding}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.doneBtn, { color: (hasPin && !isGeocoding) ? t.accent : t.subtext }]}>{isThai ? 'เสร็จ' : 'Done'}</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: t.surface, borderColor: query ? t.accent : t.divider }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: t.text }]}
          placeholder={isThai ? 'ค้นหาสถานที่, ร้านอาหาร, ที่อยู่...' : 'Search places, restaurants, address...'}
          placeholderTextColor={t.subtext + '90'}
          value={query}
          onChangeText={(v) => setQuery(v)}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCapitalize="none"
        />
        {isSearching && <ActivityIndicator size="small" color={t.accent} />}
      </View>

      {/* Search results */}
      {results.length > 0 && (
        <View style={[styles.resultsDrop, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.resultRow, index < results.length - 1 && { borderBottomColor: t.divider, borderBottomWidth: 1 }]}
                onPress={() => selectSearchResult(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.resultDot, { backgroundColor: t.accent + '25' }]}>
                  <Text style={{ fontSize: 14 }}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultName, { color: t.text }]} numberOfLines={1}>{shortName(item)}</Text>
                  <Text style={[styles.resultSub, { color: t.subtext }]} numberOfLines={1}>{subName(item)}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        {mapsAvailable ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            initialRegion={region}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            showsScale
            showsBuildings
            showsPointsOfInterests
          >
            {pinCoord && (
              <Marker
                coordinate={{ latitude: pinCoord.lat, longitude: pinCoord.lon }}
                draggable
                onDragEnd={(e: any) => placePin(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
                pinColor={t.accent}
              />
            )}
          </MapView>
        ) : (
          <View style={[styles.mapUnavailable, { backgroundColor: t.surface }]}>
            <Text style={styles.mapUnavailableIcon}>🗺️</Text>
            <Text style={[styles.mapUnavailableText, { color: t.subtext }]}>
              {isThai ? 'แผนที่ไม่พร้อมใช้งาน\n(ต้องการ native build)' : 'Map unavailable\n(requires native build)'}
            </Text>
          </View>
        )}

        {/* My location button */}
        <TouchableOpacity
          style={[styles.myLocBtn, { backgroundColor: t.surface, shadowColor: '#000' }]}
          onPress={goToMyLocation}
          activeOpacity={0.85}
        >
          <Text style={styles.myLocIcon}>🎯</Text>
        </TouchableOpacity>

        {/* Tap hint */}
        {!hasPin && (
          <View style={[styles.tapHint, { backgroundColor: t.surface + 'EE' }]}>
            <Text style={[styles.tapHintText, { color: t.subtext }]}>
              {isThai ? 'แตะแผนที่หรือค้นหาเพื่อปักหมุด' : 'Tap the map or search to drop a pin'}
            </Text>
          </View>
        )}

        {/* Selected location bar */}
        {hasPin && (
          <View style={[styles.pinBar, { backgroundColor: t.surface }]}>
            <View style={[styles.pinIconWrap, { backgroundColor: t.accent }]}>
              <Text style={styles.pinIconText}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              {isGeocoding ? (
                <ActivityIndicator size="small" color={t.accent} />
              ) : (
                <>
                  <Text style={[styles.pinName, { color: t.text }]} numberOfLines={1}>{pinLabel}</Text>
                  <Text style={[styles.pinCoords, { color: t.subtext }]}>
                    {pinCoord?.lat.toFixed(4)}, {pinCoord?.lon.toFixed(4)}
                  </Text>
                </>
              )}
            </View>
            <TouchableOpacity
              style={[styles.useBtn, { backgroundColor: t.accent }]}
              onPress={handleConfirm}
              disabled={isGeocoding}
              activeOpacity={0.85}
            >
              <Text style={styles.useBtnText}>{isThai ? 'ใช้' : 'Use'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: 14, borderBottomWidth: 1,
  },
  cancelBtn: { fontSize: 15, fontWeight: '500', minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  doneBtn: { fontSize: 15, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: SPACING.md, marginTop: SPACING.sm, marginBottom: 4,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15 },
  resultsDrop: {
    position: 'absolute', top: 130, left: SPACING.md, right: SPACING.md,
    zIndex: 200, borderRadius: RADIUS.xl, borderWidth: 1,
    maxHeight: 260, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.14, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 10,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
  },
  resultDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  resultName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  resultSub: { fontSize: 11 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapUnavailable: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  mapUnavailableIcon: { fontSize: 48 },
  mapUnavailableText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  myLocBtn: {
    position: 'absolute', top: SPACING.md, right: SPACING.md,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.15, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 5,
  },
  myLocIcon: { fontSize: 22, color: '#007AFF' },
  tapHint: {
    position: 'absolute', bottom: SPACING.lg, alignSelf: 'center',
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: 10,
  },
  tapHintText: { fontSize: 13, fontWeight: '500' },
  pinBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, paddingBottom: SPACING.lg,
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: -3 }, shadowRadius: 10, elevation: 8,
  },
  pinIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pinIconText: { fontSize: 20 },
  pinName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  pinCoords: { fontSize: 11 },
  useBtn: {
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 4,
  },
  useBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
