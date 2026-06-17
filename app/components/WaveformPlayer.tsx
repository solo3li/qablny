import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

const BAR_COUNT = 32;

interface WaveformPlayerProps {
  uri: string;
  durationSeconds?: number;
  isMe?: boolean;
}

export function WaveformPlayer({ uri, durationSeconds, isMe = false }: WaveformPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState((durationSeconds || 0) * 1000);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const playAnim = useRef(new Animated.Value(1)).current;

  // Generate stable random waveform heights once
  const barHeights = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      // Create a natural-looking waveform with peaks in the middle
      const base = Math.random() * 0.5 + 0.2;
      const envelope = Math.sin((i / BAR_COUNT) * Math.PI); // Bell curve
      return base + envelope * 0.5;
    });
  }, [uri]);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;
    if (status.durationMillis) {
      setDurationMs(status.durationMillis);
      const progress = status.positionMillis / status.durationMillis;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
    setPositionMs(status.positionMillis ?? 0);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMs(0);
      progressAnim.setValue(0);
    }
  };

  const handlePlayPause = async () => {
    // Button pulse animation
    Animated.sequence([
      Animated.timing(playAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(playAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    if (!sound) {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
      } catch (e) {
        console.error('WaveformPlayer: Failed to load audio', e);
      }
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const accentColor = isMe ? Colors.cyan : '#a78bfa';
  const dimColor = isMe ? 'rgba(0,240,255,0.2)' : 'rgba(167,139,250,0.2)';

  return (
    <View style={[styles.container, isMe ? styles.containerMe : styles.containerThem]}>
      {/* Play / Pause Button */}
      <Animated.View style={{ transform: [{ scale: playAnim }] }}>
        <TouchableOpacity
          onPress={handlePlayPause}
          style={[styles.playBtn, { backgroundColor: isMe ? Colors.cyanDim : 'rgba(139,92,246,0.2)', borderColor: accentColor + '60' }]}
          activeOpacity={0.8}
        >
          {isPlaying
            ? <Pause color={accentColor} size={17} fill={accentColor} />
            : <Play color={accentColor} size={17} fill={accentColor} />
          }
        </TouchableOpacity>
      </Animated.View>

      {/* Waveform Bars */}
      <View style={styles.waveform}>
        {barHeights.map((height, i) => {
          const isFilled = i / BAR_COUNT < progress;
          return (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  height: `${height * 100}%`,
                  backgroundColor: isFilled ? accentColor : dimColor,
                  opacity: isFilled ? 1 : 0.8,
                  transform: [{ scaleY: isPlaying && isFilled ? 1 : 0.85 }],
                },
              ]}
            />
          );
        })}
      </View>

      {/* Timer */}
      <Text style={[styles.timer, { color: accentColor }]}>
        {isPlaying || positionMs > 0
          ? formatTime(positionMs)
          : formatTime(durationMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 200,
    maxWidth: 260,
  },
  containerMe: {
    backgroundColor: 'rgba(0,240,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
  },
  containerThem: {
    backgroundColor: 'rgba(139,92,246,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  waveform: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 3,
  },
  timer: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    minWidth: 34,
    textAlign: 'right',
  },
});
