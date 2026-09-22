import React from 'react';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';

export type AppIconName =
  | 'newspaper'
  | 'newspaper-outline'
  | 'search'
  | 'explore'
  | 'trophy'
  | 'trophy-outline'
  | 'building'
  | 'house'
  | 'business'
  | 'bookmark'
  | 'bookmark-outline'
  | 'book'
  | 'profile'
  | 'profile-outline'
  | 'user'
  | 'flame'
  | 'fire'
  | 'shield'
  | 'shield-checkmark'
  | 'scale'
  | 'swords'
  | 'people'
  | 'briefcase'
  | 'alert'
  | 'alert-circle'
  | 'siren'
  | 'check'
  | 'checkmark'
  | 'checkmark-circle'
  | 'close'
  | 'close-circle'
  | 'star'
  | 'heart'
  | 'heart-outline'
  | 'eye'
  | 'comment'
  | 'chat'
  | 'chatbubble'
  | 'chatbubbles'
  | 'bell'
  | 'lock'
  | 'key'
  | 'edit'
  | 'pencil'
  | 'create'
  | 'camera'
  | 'chart'
  | 'bar-chart'
  | 'refresh'
  | 'send'
  | 'thumb-up'
  | 'thumb-down'
  | 'crown'
  | 'medal'
  | 'medal-gold'
  | 'medal-silver'
  | 'medal-bronze'
  | 'ribbon'
  | 'calendar'
  | 'time'
  | 'zap'
  | 'image'
  | 'share'
  | 'share-social'
  | 'filter'
  | 'link'
  | 'trash'
  | 'logout'
  | 'settings'
  | 'sparkles'
  | 'bulb'
  | 'folder'
  | 'folder-open'
  | 'document-text'
  | 'cloud-offline'
  | 'play'
  | 'pause'
  | 'globe'
  | 'arrow-forward'
  | 'information-circle'
  | (string & {});

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 18,
  color = '#cbd5e1',
  style,
}) => {
  switch (name) {
    case 'newspaper':
      return <Ionicons name="newspaper" size={size} color={color} style={style} />;
    case 'newspaper-outline':
      return <Ionicons name="newspaper-outline" size={size} color={color} style={style} />;
    case 'search':
    case 'explore':
      return <Ionicons name="search" size={size} color={color} style={style} />;
    case 'trophy':
      return <Ionicons name="trophy" size={size} color={color} style={style} />;
    case 'trophy-outline':
      return <Ionicons name="trophy-outline" size={size} color={color} style={style} />;
    case 'building':
    case 'house':
    case 'business':
      return <Ionicons name="business" size={size} color={color} style={style} />;
    case 'bookmark':
    case 'book':
      return <Ionicons name="bookmark" size={size} color={color} style={style} />;
    case 'bookmark-outline':
      return <Ionicons name="bookmark-outline" size={size} color={color} style={style} />;
    case 'profile':
    case 'user':
      return <Ionicons name="person" size={size} color={color} style={style} />;
    case 'profile-outline':
      return <Ionicons name="person-outline" size={size} color={color} style={style} />;
    case 'flame':
    case 'fire':
      return <Ionicons name="flame" size={size} color={color} style={style} />;
    case 'shield':
    case 'shield-checkmark':
      return <Ionicons name="shield-checkmark" size={size} color={color} style={style} />;
    case 'scale':
      return <MaterialCommunityIcons name="scale-balance" size={size} color={color} style={style} />;
    case 'swords':
      return <MaterialCommunityIcons name="sword-cross" size={size} color={color} style={style} />;
    case 'people':
      return <Ionicons name="people" size={size} color={color} style={style} />;
    case 'briefcase':
      return <Ionicons name="briefcase" size={size} color={color} style={style} />;
    case 'alert':
    case 'alert-circle':
    case 'siren':
      return <Ionicons name="warning" size={size} color={color} style={style} />;
    case 'check':
    case 'checkmark':
      return <Ionicons name="checkmark" size={size} color={color} style={style} />;
    case 'checkmark-circle':
      return <Ionicons name="checkmark-circle" size={size} color={color} style={style} />;
    case 'close':
      return <Ionicons name="close" size={size} color={color} style={style} />;
    case 'close-circle':
      return <Ionicons name="close-circle" size={size} color={color} style={style} />;
    case 'star':
      return <Ionicons name="star" size={size} color={color} style={style} />;
    case 'heart':
      return <Ionicons name="heart" size={size} color={color} style={style} />;
    case 'heart-outline':
      return <Ionicons name="heart-outline" size={size} color={color} style={style} />;
    case 'eye':
      return <Ionicons name="eye" size={size} color={color} style={style} />;
    case 'comment':
    case 'chat':
    case 'chatbubble':
      return <Ionicons name="chatbubble-ellipses" size={size} color={color} style={style} />;
    case 'chatbubbles':
      return <Ionicons name="chatbubbles" size={size} color={color} style={style} />;
    case 'bell':
      return <Ionicons name="notifications" size={size} color={color} style={style} />;
    case 'lock':
      return <Ionicons name="lock-closed" size={size} color={color} style={style} />;
    case 'key':
      return <Ionicons name="key" size={size} color={color} style={style} />;
    case 'edit':
    case 'pencil':
    case 'create':
      return <Ionicons name="create" size={size} color={color} style={style} />;
    case 'camera':
      return <Ionicons name="camera" size={size} color={color} style={style} />;
    case 'chart':
    case 'bar-chart':
      return <Ionicons name="stats-chart" size={size} color={color} style={style} />;
    case 'refresh':
      return <Ionicons name="refresh" size={size} color={color} style={style} />;
    case 'send':
      return <Ionicons name="send" size={size} color={color} style={style} />;
    case 'thumb-up':
      return <Ionicons name="thumbs-up" size={size} color={color} style={style} />;
    case 'thumb-down':
      return <Ionicons name="thumbs-down" size={size} color={color} style={style} />;
    case 'crown':
      return <FontAwesome5 name="crown" size={size} color={color} style={style} />;
    case 'medal':
      return <Ionicons name="medal" size={size} color={color || '#06b6d4'} style={style} />;
    case 'medal-gold':
      return <Ionicons name="medal" size={size} color={color || '#eab308'} style={style} />;
    case 'medal-silver':
      return <Ionicons name="medal" size={size} color={color || '#cbd5e1'} style={style} />;
    case 'medal-bronze':
      return <Ionicons name="medal" size={size} color={color || '#d97706'} style={style} />;
    case 'ribbon':
      return <Ionicons name="ribbon" size={size} color={color} style={style} />;
    case 'calendar':
      return <Ionicons name="calendar" size={size} color={color} style={style} />;
    case 'time':
      return <Ionicons name="time" size={size} color={color} style={style} />;
    case 'zap':
      return <Ionicons name="flash" size={size} color={color} style={style} />;
    case 'image':
      return <Ionicons name="image" size={size} color={color} style={style} />;
    case 'share':
    case 'share-social':
      return <Ionicons name="share-social" size={size} color={color} style={style} />;
    case 'filter':
      return <Ionicons name="filter" size={size} color={color} style={style} />;
    case 'link':
      return <Ionicons name="link" size={size} color={color} style={style} />;
    case 'trash':
      return <Ionicons name="trash" size={size} color={color} style={style} />;
    case 'logout':
      return <Ionicons name="log-out" size={size} color={color} style={style} />;
    case 'settings':
      return <Ionicons name="settings" size={size} color={color} style={style} />;
    case 'sparkles':
      return <Ionicons name="sparkles" size={size} color={color} style={style} />;
    case 'bulb':
      return <Ionicons name="bulb" size={size} color={color} style={style} />;
    case 'folder':
      return <Ionicons name="folder" size={size} color={color} style={style} />;
    case 'folder-open':
      return <Ionicons name="folder-open" size={size} color={color} style={style} />;
    case 'document-text':
      return <Ionicons name="document-text" size={size} color={color} style={style} />;
    case 'cloud-offline':
      return <Ionicons name="cloud-offline" size={size} color={color} style={style} />;
    case 'play':
      return <Ionicons name="play" size={size} color={color} style={style} />;
    case 'pause':
      return <Ionicons name="pause" size={size} color={color} style={style} />;
    case 'globe':
      return <Ionicons name="globe" size={size} color={color} style={style} />;
    case 'arrow-forward':
      return <Ionicons name="arrow-forward" size={size} color={color} style={style} />;
    default:
      return <Ionicons name="information-circle" size={size} color={color} style={style} />;
  }
};
