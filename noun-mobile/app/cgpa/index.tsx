import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, ScrollView, 
  TouchableOpacity, TextInput, Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { cacheCGPAData, getCachedCGPAData } from '../../utils/offlineStorage';

// Constants
const GRADES = {
  'A': 5,
  'B': 4,
  'C': 3,
  'D': 2,
  'E': 1,
  'F': 0,
};

type Course = {
  id: string;
  code: string;
  units: number;
  grade: keyof typeof GRADES | '';
};

type Semester = {
  id: string;
  name: string;
  courses: Course[];
};

export default function CGPACalculator() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [semesters, setSemesters] = useState<Semester[]>([]);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    const data = await getCachedCGPAData();
    if (data && data.length > 0) {
      setSemesters(data);
    } else {
      // Initialize with one empty semester
      addSemester();
    }
  };

  const saveData = async (data: Semester[]) => {
    setSemesters(data);
    await cacheCGPAData(data);
  };

  const addSemester = () => {
    const newSem: Semester = {
      id: Date.now().toString(),
      name: `Semester ${semesters.length + 1}`,
      courses: [],
    };
    saveData([...semesters, newSem]);
  };

  const removeSemester = (id: string) => {
    // In a real app we'd use a better cross-platform alert, but Alert works fine natively.
    Alert.alert("Remove Semester", "Are you sure you want to remove this semester and all its courses?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => {
        const updated = semesters.filter(s => s.id !== id);
        saveData(updated);
      }}
    ]);
  };

  const addCourse = (semesterId: string) => {
    const newCourse: Course = {
      id: Date.now().toString(),
      code: '',
      units: 3,
      grade: '',
    };
    const updated = semesters.map(s => {
      if (s.id === semesterId) {
        return { ...s, courses: [...s.courses, newCourse] };
      }
      return s;
    });
    saveData(updated);
  };

  const updateCourse = (semesterId: string, courseId: string, field: keyof Course, value: any) => {
    const updated = semesters.map(s => {
      if (s.id === semesterId) {
        return {
          ...s,
          courses: s.courses.map(c => c.id === courseId ? { ...c, [field]: value } : c)
        };
      }
      return s;
    });
    saveData(updated);
  };

  const removeCourse = (semesterId: string, courseId: string) => {
    const updated = semesters.map(s => {
      if (s.id === semesterId) {
        return { ...s, courses: s.courses.filter(c => c.id !== courseId) };
      }
      return s;
    });
    saveData(updated);
  };

  // Calculations
  let totalUnits = 0;
  let totalPoints = 0;

  semesters.forEach(s => {
    s.courses.forEach(c => {
      if (c.grade && Object.keys(GRADES).includes(c.grade) && !isNaN(c.units)) {
        totalUnits += c.units;
        totalPoints += c.units * GRADES[c.grade as keyof typeof GRADES];
      }
    });
  });

  const cgpa = totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : '0.00';

  const calculateSemesterGPA = (courses: Course[]) => {
    let sUnits = 0;
    let sPoints = 0;
    courses.forEach(c => {
      if (c.grade && Object.keys(GRADES).includes(c.grade) && !isNaN(c.units)) {
        sUnits += c.units;
        sPoints += c.units * GRADES[c.grade as keyof typeof GRADES];
      }
    });
    return sUnits > 0 ? (sPoints / sUnits).toFixed(2) : '0.00';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: '#fff', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CGPA Calculator</Text>
      </View>

      {/* Top Banner */}
      <View style={[styles.banner, { backgroundColor: colors.accent }]}>
        <View style={styles.bannerCol}>
          <Text style={styles.bannerLabel}>Total Units</Text>
          <Text style={styles.bannerValue}>{totalUnits}</Text>
        </View>
        <View style={styles.bannerCol}>
          <Text style={styles.bannerLabel}>Current CGPA</Text>
          <Text style={styles.cgpaValue}>{cgpa}</Text>
        </View>
        <View style={styles.bannerCol}>
          <Text style={styles.bannerLabel}>Total Points</Text>
          <Text style={styles.bannerValue}>{totalPoints}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {semesters.map((sem, sIndex) => {
          const sGPA = calculateSemesterGPA(sem.courses);
          return (
            <View key={sem.id} style={[styles.semesterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.semesterHeader}>
                <TextInput
                  style={[styles.semesterTitle, { color: colors.text }]}
                  value={sem.name}
                  onChangeText={(text) => {
                    const updated = semesters.map(s => s.id === sem.id ? { ...s, name: text } : s);
                    saveData(updated);
                  }}
                />
                <View style={styles.semesterHeaderRight}>
                  <Text style={[styles.sgpaText, { color: colors.accent }]}>GPA: {sGPA}</Text>
                  <TouchableOpacity onPress={() => removeSemester(sem.id)} style={styles.delBtn}>
                    <Text style={{ color: colors.error, fontSize: 24, lineHeight: 24 }}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {sem.courses.length > 0 && (
                <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.colCode, { color: colors.textMuted }]}>Course</Text>
                  <Text style={[styles.colUnit, { color: colors.textMuted }]}>Units</Text>
                  <Text style={[styles.colGrade, { color: colors.textMuted }]}>Grade</Text>
                  <View style={styles.colAction} />
                </View>
              )}

              {sem.courses.map((course) => (
                <View key={course.id} style={styles.courseRow}>
                  <TextInput
                    style={[styles.inputCode, { color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g. GST101"
                    placeholderTextColor={colors.textSecondary}
                    value={course.code}
                    onChangeText={(val) => updateCourse(sem.id, course.id, 'code', val.toUpperCase())}
                  />
                  
                  <TextInput
                    style={[styles.inputUnit, { color: colors.text, borderColor: colors.border }]}
                    keyboardType="numeric"
                    placeholder="3"
                    placeholderTextColor={colors.textSecondary}
                    value={course.units ? course.units.toString() : ''}
                    onChangeText={(val) => updateCourse(sem.id, course.id, 'units', parseInt(val) || 0)}
                  />

                  {/* Grade Selector */}
                  <View style={styles.gradeContainer}>
                    {Object.keys(GRADES).map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.gradeBubble,
                          { borderColor: colors.border },
                          course.grade === g && { backgroundColor: colors.accent, borderColor: colors.accent }
                        ]}
                        onPress={() => updateCourse(sem.id, course.id, 'grade', g)}
                      >
                        <Text style={[
                          { color: colors.textSecondary, fontSize: 12 },
                          course.grade === g && { color: '#fff', fontWeight: 'bold' }
                        ]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity onPress={() => removeCourse(sem.id, course.id)} style={styles.delCourseBtn}>
                    <Text style={{ color: colors.error, fontSize: 20 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={[styles.addCourseBtn, { borderColor: colors.accent }]} onPress={() => addCourse(sem.id)}>
                <Text style={{ color: colors.accent, fontWeight: 'bold' }}>+ Add Course</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity style={[styles.addSemBtn, { backgroundColor: colors.accent }]} onPress={addSemester}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>+ Add Semester</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
  backBtn: { paddingRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  banner: { 
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', 
    paddingVertical: 24, paddingHorizontal: 10,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: {width: 0, height: 2}
  },
  bannerCol: { alignItems: 'center' },
  bannerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  bannerValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  cgpaValue: { color: '#fff', fontSize: 40, fontWeight: '900' },

  scrollContent: { padding: 16, paddingBottom: 40, paddingTop: 24 },
  
  semesterCard: { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, elevation: 1 },
  semesterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  semesterTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  semesterHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  sgpaText: { fontSize: 16, fontWeight: 'bold', marginRight: 10 },
  delBtn: { padding: 4, paddingHorizontal: 8 },

  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 6, marginBottom: 12 },
  colCode: { flex: 2, fontSize: 12, fontWeight: 'bold' },
  colUnit: { flex: 1, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  colGrade: { flex: 3.5, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  colAction: { width: 30 },

  courseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inputCode: { flex: 2, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginRight: 6 },
  inputUnit: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, textAlign: 'center', marginRight: 6 },
  gradeContainer: { flex: 3.5, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  gradeBubble: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, justifyContent: 'center', alignItems: 'center', margin: 2 },
  delCourseBtn: { width: 30, alignItems: 'center', justifyContent: 'center' },

  addCourseBtn: { marginTop: 10, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1 },
  addSemBtn: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 30 },
});
