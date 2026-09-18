import React from 'react';
import { StyleSheet, View, Image, Text, StyleProp, ViewStyle } from 'react-native';
import { THEME } from '../constants/theme';

interface SabootLogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
}

export const SabootLogo: React.FC<SabootLogoProps> = ({
  size = 36,
  showText = false,
  textColor = THEME.colors.foreground,
  style,
  rounded = true,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../assets/logo.jpg')}
        style={[
          styles.logoImage,
          {
            width: size,
            height: size,
            borderRadius: rounded ? Math.round(size * 0.2) : 0,
          },
        ]}
        resizeMode="contain"
      />
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.brandText, { color: textColor }]}>SABOOT</Text>
          <Text style={styles.subText}>ATTESTATION CONSOLE</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    backgroundColor: '#FFFFFF',
  },
  textContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: THEME.colors.muted,
  },
});

export default SabootLogo;
