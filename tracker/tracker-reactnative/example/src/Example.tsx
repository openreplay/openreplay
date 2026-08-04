import Openreplay from '@openreplay/react-native';
import * as React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from 'react-native';

const { ORSanitizedView } = Openreplay;

const TrackedRegion = (props: ViewProps) => (
  <Openreplay.ORTrackedView
    screenName="ReproScreen"
    viewName="ReproRegion"
    {...props}
  />
);

// ORTouchTrackingView is still a bare legacy (paper) ViewManager used directly as
// the children's parent - i.e. exactly the shape ORSanitizedView had before the
// fix. Kept here as the "broken" reference to compare the fixed wrappers against.
const RawInteropView = Openreplay.ORTouchTrackingView;

const CONTAINERS: Array<[string, React.ComponentType<ViewProps>]> = [
  ['plain View (reference)', View],
  ['ORSanitizedView', ORSanitizedView],
  ['ORTrackedView', TrackedRegion],
  ['raw legacy interop', RawInteropView],
];

/**
 * Customer repro: an outer sanitized region acting as a flex container, holding a
 * layout-only row (which Fabric flattens away) that holds a NESTED sanitized
 * region. The nested region is the child that gets misplaced.
 */
const NestedFlattened = ({
  Container,
}: {
  Container: React.ComponentType<ViewProps>;
}) => (
  <Container style={styles.confirmContent}>
    <View style={styles.feeRow}>
      <Text style={styles.label}>Fees</Text>
      <Container style={styles.feeValueContainer}>
        <Text style={styles.value}>- $16,002.00 COP</Text>
      </Container>
    </View>
  </Container>
);

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const SanitizedViewLayoutRepro = ({ visible, onClose }: Props) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.cases}>
            <Text style={styles.heading}>
              A. nested region, flattened parent row
            </Text>
            {CONTAINERS.map(([name, Container]) => (
              <View key={name}>
                <Text style={styles.caseTitle}>{name}</Text>
                <NestedFlattened Container={Container} />
              </View>
            ))}

            <Text style={styles.heading}>
              B. nested region, NON-flattened parent row (bg color)
            </Text>
            <Text style={styles.caseTitle}>raw legacy interop</Text>
            <RawInteropView style={styles.confirmContent}>
              <View style={[styles.feeRow, styles.opaqueRow]}>
                <Text style={styles.label}>Fees</Text>
                <RawInteropView style={styles.feeValueContainer}>
                  <Text style={styles.value}>- $16,002.00 COP</Text>
                </RawInteropView>
              </View>
            </RawInteropView>

            <Text style={styles.heading}>C. touch inside sanitized region</Text>
            <ORSanitizedView style={styles.confirmContent}>
              <Pressable style={styles.tapTarget} onPress={onClose}>
                <Text style={styles.value}>Tap me to close</Text>
              </Pressable>
            </ORSanitizedView>
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    gap: 12,
    maxHeight: '92%',
  },
  cases: {
    paddingBottom: 12,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#394EFF',
    marginTop: 16,
  },
  caseTitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
  confirmContent: {
    gap: 20,
    paddingVertical: 8,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  opaqueRow: {
    backgroundColor: '#f3f3f3',
  },
  feeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  tapTarget: {
    backgroundColor: '#e8ebff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  label: {
    fontSize: 16,
    color: '#444',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  closeBtn: {
    backgroundColor: '#394EFF',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeText: {
    color: 'white',
    fontWeight: '600',
  },
});
