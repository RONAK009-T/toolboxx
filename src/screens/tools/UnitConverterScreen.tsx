import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

type CategoryType = 'length' | 'weight' | 'temp' | 'area' | 'speed' | 'data' | 'time';

interface UnitDef {
  key: string;
  name: string;
  factor: number; // relative to base unit
}

const UNIT_DATA: Record<CategoryType, { title: string; base: string; units: UnitDef[] }> = {
  length: {
    title: 'Length',
    base: 'm',
    units: [
      { key: 'mm', name: 'Millimeter (mm)', factor: 0.001 },
      { key: 'cm', name: 'Centimeter (cm)', factor: 0.01 },
      { key: 'm', name: 'Meter (m)', factor: 1 },
      { key: 'km', name: 'Kilometer (km)', factor: 1000 },
      { key: 'in', name: 'Inch (in)', factor: 0.0254 },
      { key: 'ft', name: 'Foot (ft)', factor: 0.3048 },
      { key: 'yd', name: 'Yard (yd)', factor: 0.9144 },
      { key: 'mi', name: 'Mile (mi)', factor: 1609.344 },
    ],
  },
  weight: {
    title: 'Weight / Mass',
    base: 'kg',
    units: [
      { key: 'mg', name: 'Milligram (mg)', factor: 0.000001 },
      { key: 'g', name: 'Gram (g)', factor: 0.001 },
      { key: 'kg', name: 'Kilogram (kg)', factor: 1 },
      { key: 'ton', name: 'Metric Ton (t)', factor: 1000 },
      { key: 'oz', name: 'Ounce (oz)', factor: 0.0283495 },
      { key: 'lb', name: 'Pound (lb)', factor: 0.453592 },
    ],
  },
  temp: {
    title: 'Temperature',
    base: 'C',
    units: [
      { key: 'C', name: 'Celsius (°C)', factor: 1 },
      { key: 'F', name: 'Fahrenheit (°F)', factor: 1 },
      { key: 'K', name: 'Kelvin (K)', factor: 1 },
    ],
  },
  area: {
    title: 'Area',
    base: 'sqm',
    units: [
      { key: 'sqft', name: 'Square Foot (sq ft)', factor: 0.092903 },
      { key: 'sqm', name: 'Square Meter (sq m)', factor: 1 },
      { key: 'acre', name: 'Acre (ac)', factor: 4046.86 },
      { key: 'ha', name: 'Hectare (ha)', factor: 10000 },
      { key: 'sqkm', name: 'Square Kilometer', factor: 1000000 },
    ],
  },
  speed: {
    title: 'Speed',
    base: 'mps',
    units: [
      { key: 'mps', name: 'Meters/sec (m/s)', factor: 1 },
      { key: 'kmh', name: 'Kilometers/hour (km/h)', factor: 0.277778 },
      { key: 'mph', name: 'Miles/hour (mph)', factor: 0.44704 },
      { key: 'knot', name: 'Knots (kn)', factor: 0.514444 },
    ],
  },
  data: {
    title: 'Digital Data',
    base: 'MB',
    units: [
      { key: 'B', name: 'Byte (B)', factor: 0.000001 },
      { key: 'KB', name: 'Kilobyte (KB)', factor: 0.001 },
      { key: 'MB', name: 'Megabyte (MB)', factor: 1 },
      { key: 'GB', name: 'Gigabyte (GB)', factor: 1000 },
      { key: 'TB', name: 'Terabyte (TB)', factor: 1000000 },
    ],
  },
  time: {
    title: 'Time',
    base: 'sec',
    units: [
      { key: 'ms', name: 'Millisecond (ms)', factor: 0.001 },
      { key: 'sec', name: 'Second (s)', factor: 1 },
      { key: 'min', name: 'Minute (min)', factor: 60 },
      { key: 'hr', name: 'Hour (hr)', factor: 3600 },
      { key: 'day', name: 'Day', factor: 86400 },
      { key: 'week', name: 'Week', factor: 604800 },
    ],
  },
};

export const UnitConverterScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [activeCategory, setActiveCategory] = useState<CategoryType>('length');
  const [inputValue, setInputValue] = useState('1');
  const [fromUnitKey, setFromUnitKey] = useState('m');
  const [toUnitKey, setToUnitKey] = useState('ft');

  const currentCategoryData = UNIT_DATA[activeCategory];

  const handleCategoryChange = (cat: CategoryType) => {
    triggerHaptic('light');
    setActiveCategory(cat);
    const units = UNIT_DATA[cat].units;
    setFromUnitKey(units[0].key);
    setToUnitKey(units[1] ? units[1].key : units[0].key);
  };

  const convertedValue = useMemo(() => {
    const val = parseFloat(inputValue);
    if (isNaN(val)) return '0';

    if (activeCategory === 'temp') {
      let celsius = val;
      if (fromUnitKey === 'F') celsius = ((val - 32) * 5) / 9;
      if (fromUnitKey === 'K') celsius = val - 273.15;

      let result = celsius;
      if (toUnitKey === 'F') result = (celsius * 9) / 5 + 32;
      if (toUnitKey === 'K') result = celsius + 273.15;

      return parseFloat(result.toFixed(4)).toString();
    }

    const fromUnit = currentCategoryData.units.find((u) => u.key === fromUnitKey);
    const toUnit = currentCategoryData.units.find((u) => u.key === toUnitKey);

    if (!fromUnit || !toUnit) return '0';

    const inBase = val * fromUnit.factor;
    const finalVal = inBase / toUnit.factor;

    if (finalVal < 0.0001 && finalVal > 0) {
      return finalVal.toExponential(4);
    }
    return parseFloat(finalVal.toFixed(6)).toString();
  }, [inputValue, activeCategory, fromUnitKey, toUnitKey, currentCategoryData]);

  const swapUnits = () => {
    triggerHaptic('light');
    const temp = fromUnitKey;
    setFromUnitKey(toUnitKey);
    setToUnitKey(temp);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Unit Converter"
        onBack={onBack}
        subtitle="Universal offline unit translations"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Category Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {(Object.keys(UNIT_DATA) as CategoryType[]).map((cat) => {
            const isSel = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => handleCategoryChange(cat)}
                style={[
                  styles.catBtn,
                  {
                    backgroundColor: isSel ? theme.primary : theme.surface,
                    borderColor: isSel ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.catBtnText, { color: isSel ? '#FFF' : theme.textSecondary }]}>
                  {UNIT_DATA[cat].title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Input & Unit From */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>From</Text>
          <TextInput
            keyboardType="numeric"
            value={inputValue}
            onChangeText={(t) => {
              setInputValue(t);
              triggerHaptic('light');
            }}
            placeholder="0"
            placeholderTextColor={theme.textMuted}
            style={[styles.mainInput, { color: theme.text }]}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPillsRow}>
            {currentCategoryData.units.map((u) => {
              const isSel = fromUnitKey === u.key;
              return (
                <TouchableOpacity
                  key={`from-${u.key}`}
                  onPress={() => {
                    triggerHaptic('light');
                    setFromUnitKey(u.key);
                  }}
                  style={[
                    styles.unitPill,
                    {
                      backgroundColor: isSel ? theme.primary : theme.background,
                      borderColor: isSel ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.unitPillText, { color: isSel ? '#FFF' : theme.textSecondary }]}>
                    {u.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Swap Button */}
        <TouchableOpacity
          onPress={swapUnits}
          style={[styles.swapBtn, { backgroundColor: theme.primary, borderColor: theme.border }]}
        >
          <Ionicons name="swap-vertical" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Converted Output & Unit To */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>To</Text>
          <Text style={[styles.outputValue, { color: theme.primary }]}>{convertedValue}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPillsRow}>
            {currentCategoryData.units.map((u) => {
              const isSel = toUnitKey === u.key;
              return (
                <TouchableOpacity
                  key={`to-${u.key}`}
                  onPress={() => {
                    triggerHaptic('light');
                    setToUnitKey(u.key);
                  }}
                  style={[
                    styles.unitPill,
                    {
                      backgroundColor: isSel ? theme.primary : theme.background,
                      borderColor: isSel ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.unitPillText, { color: isSel ? '#FFF' : theme.textSecondary }]}>
                    {u.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  catScroll: {
    gap: 8,
    marginBottom: 16,
  },
  catBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  catBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  mainInput: {
    fontSize: 28,
    fontWeight: '800',
    paddingVertical: 4,
    marginBottom: 12,
  },
  outputValue: {
    fontSize: 28,
    fontWeight: '800',
    paddingVertical: 4,
    marginBottom: 12,
  },
  unitPillsRow: {
    marginTop: 4,
  },
  unitPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  unitPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  swapBtn: {
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderWidth: 2,
    elevation: 4,
  },
});
