import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing } from '../theme';

const HOLD_MS = 2800;

export function SosButton({
  onTrigger,
  disabled = false,
}: {
  onTrigger: () => void;
  disabled?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggered = useRef(false);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (disabled && timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      progress.stopAnimation();
      progress.setValue(0);
      setHolding(false);
    }
  }, [disabled, progress]);

  function startHold() {
    if (disabled || triggered.current) return;
    setHolding(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: false,
    }).start();
    timer.current = setTimeout(() => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      triggered.current = true;
      setHolding(false);
      progress.stopAnimation();
      progress.setValue(0);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      onTrigger();
    }, HOLD_MS);
  }

  function cancelHold() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (triggered.current) return;
    setHolding(false);
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }

  const ringScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1.06],
  });
  const ringOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.62],
  });

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.ring,
          { transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      <Pressable
        onPressIn={startHold}
        onPressOut={cancelHold}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Send SOS emergency alert"
        accessibilityHint="Press and hold for about three seconds to alert your trusted contacts"
        accessibilityState={{ disabled, busy: holding }}
        style={({ pressed }) => [
          styles.button,
          (pressed || holding) && styles.buttonHolding,
          disabled && styles.buttonDisabled,
        ]}
      >
        <Ionicons name="shield-half" size={30} color={colors.white} />
        <Text style={styles.sos}>SOS</Text>
        <Text style={styles.hint}>{holding ? 'Keep holding…' : 'Hold 3 seconds'}</Text>
      </Pressable>
    </View>
  );
}

const SIZE = 208;
const INNER = 176;

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.redSoft,
    borderWidth: 2,
    borderColor: '#F1BDBD',
  },
  button: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...shadows.floating,
  },
  buttonHolding: { backgroundColor: colors.redDark, transform: [{ scale: 0.97 }] },
  buttonDisabled: { opacity: 0.5 },
  sos: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 2,
  },
  hint: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFE3E3',
    marginTop: 2,
  },
});

export const SOS_RADIUS = radius.pill;
export const SOS_SPACING = spacing.md;
