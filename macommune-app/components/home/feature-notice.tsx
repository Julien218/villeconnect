import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type FeatureNoticeContent = { title: string; text: string };
export function FeatureNotice({ notice, onClose }: { notice: FeatureNoticeContent | null; onClose: () => void }) {
  return (
    <Modal visible={!!notice} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card} accessibilityViewIsModal>
          <Ionicons name="information-circle-outline" color="#00CFFF" size={36} />
          <Text accessibilityRole="header" style={s.title}>{notice?.title}</Text>
          <Text style={s.text}>{notice?.text}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={s.button}><Text style={s.buttonText}>Fermer</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,3,10,0.85)', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#061323', borderColor: '#154665', borderWidth: 1, borderRadius: 24, padding: 28, gap: 16 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' },
  text: { color: '#ADBCCD', fontSize: 14, lineHeight: 23 },
  button: { borderColor: '#008EFF', borderWidth: 1, backgroundColor: '#062747', padding: 13, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#00CEFF', fontWeight: '600' },
});
