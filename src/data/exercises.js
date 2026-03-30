export const exerciseLibrary = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell', description: 'Lie on a flat bench, grip the barbell slightly wider than shoulder width, lower to chest and press up.' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', description: 'Set bench to 30-45°, press dumbbells up from chest level.' },
  { id: 'cable-fly', name: 'Cable Fly', muscle: 'Chest', equipment: 'Cable', description: 'Stand between cable stations, bring handles together in front of chest with slight elbow bend.' },
  { id: 'push-up', name: 'Push Up', muscle: 'Chest', equipment: 'Bodyweight', description: 'Standard push up position, lower chest to ground and push back up.' },

  // Back
  { id: 'deadlift', name: 'Deadlift', muscle: 'Back', equipment: 'Barbell', description: 'Stand with feet hip-width, grip bar, drive through heels keeping back straight.' },
  { id: 'pull-up', name: 'Pull Up', muscle: 'Back', equipment: 'Bodyweight', description: 'Hang from bar with overhand grip, pull chin above the bar.' },
  { id: 'barbell-row', name: 'Barbell Row', muscle: 'Back', equipment: 'Barbell', description: 'Hinge at hips, pull barbell to lower chest/upper belly.' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle: 'Back', equipment: 'Cable', description: 'Sit at lat pulldown machine, pull bar to upper chest.' },

  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', description: 'Press barbell from shoulders to overhead lockout.' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell', description: 'Raise dumbbells out to sides until arms are parallel to floor.' },
  { id: 'face-pull', name: 'Face Pull', muscle: 'Shoulders', equipment: 'Cable', description: 'Pull rope attachment towards face, externally rotating shoulders.' },

  // Legs
  { id: 'squat', name: 'Barbell Squat', muscle: 'Legs', equipment: 'Barbell', description: 'Bar on upper back, squat down until thighs are parallel, stand back up.' },
  { id: 'leg-press', name: 'Leg Press', muscle: 'Legs', equipment: 'Machine', description: 'Sit in leg press machine, press platform away by extending legs.' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscle: 'Legs', equipment: 'Barbell', description: 'Hinge at hips with slight knee bend, lower bar along legs.' },
  { id: 'leg-curl', name: 'Leg Curl', muscle: 'Legs', equipment: 'Machine', description: 'Lie face down, curl weight towards glutes.' },
  { id: 'calf-raise', name: 'Calf Raise', muscle: 'Legs', equipment: 'Machine', description: 'Stand on platform edge, raise heels as high as possible.' },
  { id: 'lunge', name: 'Lunge', muscle: 'Legs', equipment: 'Dumbbell', description: 'Step forward, lower back knee towards ground, push back to start.' },

  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', muscle: 'Arms', equipment: 'Barbell', description: 'Curl barbell from thighs to shoulders with strict form.' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscle: 'Arms', equipment: 'Cable', description: 'Push cable attachment down until arms are fully extended.' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscle: 'Arms', equipment: 'Dumbbell', description: 'Curl dumbbells with neutral grip (palms facing each other).' },
  { id: 'skull-crusher', name: 'Skull Crusher', muscle: 'Arms', equipment: 'Barbell', description: 'Lie on bench, lower barbell to forehead then extend arms.' },

  // Core
  { id: 'plank', name: 'Plank', muscle: 'Core', equipment: 'Bodyweight', description: 'Hold push-up position on forearms, keep body straight.' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscle: 'Core', equipment: 'Cable', description: 'Kneel facing cable, crunch down bringing elbows to knees.' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscle: 'Core', equipment: 'Bodyweight', description: 'Hang from bar, raise legs to parallel or higher.' },
];

export const muscleGroups = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'];
export const equipmentTypes = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight'];
