import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';

interface CalendarPickerModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD or ISO
  onSelectDate: (dateString: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarPickerModal({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}: CalendarPickerModalProps) {
  // Parse initial selected date
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const validInitial = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewYear, setViewYear] = useState(validInitial.getFullYear());
  const [viewMonth, setViewMonth] = useState(validInitial.getMonth());

  useEffect(() => {
    if (visible && selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [visible, selectedDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Compute days in month
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const selectedDateObj = new Date(selectedDate);
  const selectedYear = !isNaN(selectedDateObj.getTime()) ? selectedDateObj.getFullYear() : -1;
  const selectedMonth = !isNaN(selectedDateObj.getTime()) ? selectedDateObj.getMonth() : -1;
  const selectedDay = !isNaN(selectedDateObj.getTime()) ? selectedDateObj.getDate() : -1;

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    onSelectDate(dateStr);
    onClose();
  };

  const handleSelectToday = () => {
    const mm = String(todayMonth + 1).padStart(2, '0');
    const dd = String(todayDay).padStart(2, '0');
    onSelectDate(`${todayYear}-${mm}-${dd}`);
    onClose();
  };

  // Build grid items: leading blanks + day numbers
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Month / Year Navigation */}
          <View style={styles.header}>
            <Pressable style={styles.navButton} onPress={handlePrevMonth}>
              <Text style={styles.navButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <Pressable style={styles.navButton} onPress={handleNextMonth}>
              <Text style={styles.navButtonText}>›</Text>
            </Pressable>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((wd, idx) => (
              <Text key={idx} style={styles.weekDayText}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <View key={`blank-${idx}`} style={styles.dayCell} />;
              }

              const isSelected =
                viewYear === selectedYear &&
                viewMonth === selectedMonth &&
                day === selectedDay;

              const isToday =
                viewYear === todayYear &&
                viewMonth === todayMonth &&
                day === todayDay;

              return (
                <Pressable
                  key={`day-${day}`}
                  style={[
                    styles.dayCell,
                    isSelected && styles.selectedDayCell,
                    !isSelected && isToday && styles.todayCell,
                  ]}
                  onPress={() => handleSelectDay(day)}>
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      !isSelected && isToday && styles.todayText,
                    ]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable style={styles.todayButton} onPress={handleSelectToday}>
              <Text style={styles.todayButtonText}>Select Today</Text>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#374151',
    lineHeight: 24,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 6,
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  selectedDayCell: {
    backgroundColor: '#2563EB',
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  dayText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  todayText: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  todayButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  todayButtonText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  closeButtonText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
});
