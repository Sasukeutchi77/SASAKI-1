import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppIcon } from '../AppIcon';

export type CreateHouseStep = 1 | 2 | 3;

interface CreateHouseStepIndicatorProps {
  currentStep: CreateHouseStep;
  onSelectStep: (step: CreateHouseStep) => void;
  step1Completed: boolean;
  step2Completed: boolean;
  step3Completed: boolean;
}

export const CreateHouseStepIndicator: React.FC<CreateHouseStepIndicatorProps> = ({
  currentStep,
  onSelectStep,
  step1Completed,
  step2Completed,
  step3Completed,
}) => {
  const steps: { number: CreateHouseStep; label: string; icon: any; isCompleted: boolean }[] = [
    {
      number: 1,
      label: 'Identité',
      icon: 'newspaper',
      isCompleted: step1Completed,
    },
    {
      number: 2,
      label: 'Visuels & Thèmes',
      icon: 'camera',
      isCompleted: step2Completed,
    },
    {
      number: 3,
      label: 'Siège & Accord',
      icon: 'shield-checkmark',
      isCompleted: step3Completed,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {steps.map((s, idx) => {
          const isActive = currentStep === s.number;
          return (
            <React.Fragment key={s.number}>
              <TouchableOpacity
                style={[
                  styles.stepItem,
                  isActive && styles.activeStepItem,
                  s.isCompleted && !isActive && styles.completedStepItem,
                ]}
                onPress={() => onSelectStep(s.number)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.circle,
                    isActive && styles.activeCircle,
                    s.isCompleted && !isActive && styles.completedCircle,
                  ]}
                >
                  {s.isCompleted && !isActive ? (
                    <AppIcon name="checkmark" size={12} color="#06b6d4" />
                  ) : (
                    <Text
                      style={[
                        styles.numberText,
                        isActive && styles.activeNumberText,
                      ]}
                    >
                      {s.number}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    isActive && styles.activeLabel,
                    s.isCompleted && !isActive && styles.completedLabel,
                  ]}
                  numberOfLines={1}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>

              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    (steps[idx].isCompleted || currentStep > s.number) && styles.activeConnector,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#070d1e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeStepItem: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: '#06b6d4',
  },
  completedStepItem: {
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  activeCircle: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  completedCircle: {
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  numberText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
  },
  activeNumberText: {
    color: '#000000',
    fontWeight: '900',
  },
  label: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  activeLabel: {
    color: '#ffffff',
    fontWeight: '900',
  },
  completedLabel: {
    color: '#cbd5e1',
    fontWeight: '700',
  },
  connector: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 4,
  },
  activeConnector: {
    backgroundColor: 'rgba(6, 182, 212, 0.4)',
  },
});
