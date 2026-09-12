import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Category } from '../types';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[
          styles.pill,
          selectedCategoryId === '' && styles.activePill,
        ]}
        onPress={() => onSelectCategory('')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pillText,
            selectedCategoryId === '' && styles.activePillText,
          ]}
        >
          🔥 Tous
        </Text>
      </TouchableOpacity>

      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.pill, isSelected && styles.activePill]}
            onPress={() => onSelectCategory(cat.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                isSelected && styles.activePillText,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0c1228',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activePill: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderColor: '#00d2ff',
  },
  pillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  activePillText: {
    color: '#00d2ff',
    fontWeight: '800',
  },
});
