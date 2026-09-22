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
  | 'bookmark'
  | 'bookmark-outline'
  | 'profile'
  | 'profile-outline'
  | 'user'
  | 'flame'
  | 'fire'
  | 'shield'
  | 'scale'
  | 'swords'
  | 'people'
  | 'briefcase'
  | 'alert'
  | 'siren'
  | 'check'
  | 'checkmark-circle'
  | 'close'
  | 'close-circle'
  | 'star'
  | 'heart'
  | 'eye'
  | 'comment'
  | 'chat'
  | 'bell'
  | 'lock'
  | 'key'
  | 'edit'
  | 'pencil'
  | 'camera'
  | 'chart'
  | 'refresh'
  | 'send'
  | 'thumb-up'
  | 'thumb-down'
  | 'crown'
  | 'medal-gold'
  | 'medal-silver'
  | 'medal-bronze'
  | 'calendar'
  | 'zap'
  | 'image'
  | 'share'
  | 'filter'
  | 'link'
  | 'trash'
  | 'logout'
  | 'settings';

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
      return <Ionicons name="business" size={size} color={color} style={style} />;
    case 'bookmark':
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
    case 'siren':
      return <Ionicons name="warning" size={size} color={color} style={style} />;
    case 'check':
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
    case 'eye':
      return <Ionicons name="eye" size={size} color={color} style={style} />;
    case 'comment':
    case 'chat':
      return <Ionicons name="chatbubble-ellipses" size={size} color={color} style={style} />;
    case 'bell':
      return <Ionicons name="notifications" size={size} color={color} style={style} />;
    case 'lock':
      return <Ionicons name="lock-closed" size={size} color={color} style={style} />;
    case 'key':
      return <Ionicons name="key" size={size} color={color} style={style} />;
    case 'edit':
    case 'pencil':
      return <Ionicons name="create" size={size} color={color} style={style} />;
    case 'camera':
      return <Ionicons name="camera" size={size} color={color} style={style} />;
    case 'chart':
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
    case 'medal-gold':
      return <Ionicons name="medal" size={size} color={color || '#eab308'} style={style} />;
    case 'medal-silver':
      return <Ionicons name="medal" size={size} color={color || '#cbd5e1'} style={style} />;
    case 'medal-bronze':
      return <Ionicons name="medal" size={size} color={color || '#d97706'} style={style} />;
    case 'calendar':
      return <Ionicons name="calendar" size={size} color={color} style={style} />;
    case 'zap':
      return <Ionicons name="flash" size={size} color={color} style={style} />;
    case 'image':
      return <Ionicons name="image" size={size} color={color} style={style} />;
    case 'share':
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
    default:
      return <Ionicons name="information-circle" size={size} color={color} style={style} />;
  }
};
