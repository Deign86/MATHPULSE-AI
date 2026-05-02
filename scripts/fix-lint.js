const fs = require('fs');
const path = require('path');

const fixes = [
  // App.tsx
  { file: 'src/App.tsx', from: 'import { AlertTriangle, ArrowRight, Calculator, Crown, Flame, Menu, Zap }', to: 'import { ArrowRight, Calculator, Crown, Flame, Menu, Zap }' },
  
  // AdminAIMonitoring.tsx
  { file: 'src/components/AdminAIMonitoring.tsx', from: ', resolveHealthStatus', to: '' },
  
  // AdminDashboard.tsx  
  { file: 'src/components/AdminDashboard.tsx', from: ', motion', to: '' },
  
  // AdminPriorityModules.tsx
  { file: 'src/components/AdminPriorityModules.tsx', from: 'useEffect ', to: '' },
  { file: 'src/components/AdminPriorityModules.tsx', from: ', motion', to: '' },
  
  // AppLoadingScreen.tsx - remove unused style vars
  { file: 'src/components/AppLoadingScreen.tsx', from: "screenStyle = '", to: "// screenStyle = '" },
  { file: 'src/components/AppLoadingScreen.tsx', from: "cardStyle = '", to: "// cardStyle = '" },
  { file: 'src/components/AppLoadingScreen.tsx', from: "avatarShellStyle = '", to: "// avatarShellStyle = '" },
  { file: 'src/components/AppLoadingScreen.tsx', from: "avatarStyle = '", to: "// avatarStyle = '" },
  { file: 'src/components/AppLoadingScreen.tsx', from: "messageRowStyle = '", to: "// messageRowStyle = '" },
  { file: 'src/components/AppLoadingScreen.tsx', from: "spinnerStyle = '", to: "// spinnerStyle = '" },
  { file: 'src/components/AppLoadingScreen.tsx', from: "titleStyle = '", to: "// titleStyle = '" },
  { file: 'src/components/AppLoadingScreen.tsx', from: "messageStyle = '", to: "// messageStyle = '" },
  
  // Composites/AvatarShop - unused vars need different approach
  // LearningPath.tsx - unused variables
  { file: 'src/components/LearningPath.tsx', from: 'let studentGrade', to: '// let studentGrade' },
  
  // LessonViewer.tsx
  { file: 'src/components/LessonViewer.tsx', from: ', Volume2, Pause, ChevronRight', to: '' },
  { file: 'src/components/LessonViewer.tsx', from: ', AnimatePresence', to: '' },
  { file: 'src/components/LessonViewer.tsx', from: 'let direction', to: '// let direction' },
  { file: 'src/components/LessonViewer.tsx', from: 'let isPlaying', to: '// let isPlaying' },
  
  // LoginPage.tsx
  { file: 'src/components/LoginPage.tsx', from: 'Zap,', to: '' },
  { file: 'src/components/LoginPage.tsx', from: 'AnimatePresence,', to: '' },
  
  // MasteryHeatmap.tsx
  { file: 'src/components/MasteryHeatmap.tsx', from: 'getMasteryBgHex,', to: '' },
  
  // ModuleDetailView.tsx
  { file: 'src/components/ModuleDetailView.tsx', from: 'Circle,', to: '' },
  { file: 'src/components/ModuleDetailView.tsx', from: 'AnimatePresence,', to: '' },
  { file: 'src/components/ModuleDetailView.tsx', from: 'Button,', to: '' },
  { file: 'src/components/ModuleDetailView.tsx', from: 'Progress,', to: '' },
  
  // ModulesPage.tsx
  { file: 'src/components/ModulesPage.tsx', from: 'Module,', to: '' },
  
  // NotificationCenter.tsx
  { file: 'src/components/NotificationCenter.tsx', from: 'let userRole', to: '// let userRole' },
  { file: 'src/components/NotificationCenter.tsx', from: 'let loading', to: '// let loading' },
  
  // ProfileModal.tsx
  { file: 'src/components/ProfileModal.tsx', from: 'MapPin,', to: '' },
  
  // TasksBoard.tsx
  { file: 'src/components/TasksBoard.tsx', from: 'X,', to: '' },
  { file: 'src/components/TasksBoard.tsx', from: 'Calendar,', to: '' },
  
  // TeacherDashboard.tsx
  { file: 'src/components/TeacherDashboard.tsx', from: 'BookOpen,', to: '' },
  { file: 'src/components/TeacherDashboard.tsx', from: 'MessageCircle,', to: '' },
  { file: 'src/components/TeacherDashboard.tsx', from: 'Play,', to: '' },
  { file: 'src/components/TeacherDashboard.tsx', from: 'Award,', to: '' },
  { file: 'src/components/TeacherDashboard.tsx', from: 'Upload,', to: '' },
  { file: 'src/components/TeacherDashboard.tsx', from: 'Eye,', to: '' },
  { file: 'src/components/TeacherDashboard.tsx', from: 'Trash2,', to: '' },
  
  // TopicMasteryView.tsx
  { file: 'src/components/TopicMasteryView.tsx', from: 'Info,', to: '' },
  { file: 'src/components/TopicMasteryView.tsx', from: 'XCircle,', to: '' },
  
  // XPNotification.tsx
  { file: 'src/components/XPNotification.tsx', from: 'useState,', to: '' },
  
  // StudentCompetencyTable.tsx
  { file: 'src/components/StudentCompetencyTable.tsx', from: 'TrendingDown,', to: '' },
  
  // StudentProfileModal.tsx
  { file: 'src/components/StudentProfileModal.tsx', from: 'User,', to: '' },
  
  // SubjectDetailView.tsx
  { file: 'src/components/SubjectDetailView.tsx', from: 'Clock,', to: '' },
  { file: 'src/components/SubjectDetailView.tsx', from: 'Lock,', to: '' },
  
  // AuthContext.tsx
  { file: 'src/contexts/AuthContext.tsx', from: 'TeacherProfile,', to: '' },
  { file: 'src/contexts/AuthContext.tsx', from: 'AdminProfile,', to: '' },
  
  // Services - clean up imports
  { file: 'src/services/adminService.ts', from: 'setDoc,', to: '' },
  { file: 'src/services/chatService.ts', from: 'limit,', to: '' },
  { file: 'src/services/gamificationService.ts', from: 'increment,', to: '' },
  { file: 'src/services/gamificationService.ts', from: 'UserAchievements,', to: '' },
  { file: 'src/services/progressService.ts', from: 'getDocs,', to: '' },
  { file: 'src/services/progressService.ts', from: 'query,', to: '' },
  { file: 'src/services/progressService.ts', from: 'where,', to: '' },
  { file: 'src/services/progressService.ts', from: 'orderBy,', to: '' },
  { file: 'src/services/progressService.ts', from: 'limit,', to: '' },
  { file: 'src/services/progressService.ts', from: 'Timestamp,', to: '' },
];

let fixed = 0;
for (const fix of fixes) {
  const fullPath = path.join(__dirname, fix.file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes(fix.from)) {
      content = content.replace(fix.from, fix.to);
      fs.writeFileSync(fullPath, content);
      console.log('Fixed:', fix.file);
      fixed++;
    }
  }
}

console.log(`\nTotal fixed: ${fixed}`);