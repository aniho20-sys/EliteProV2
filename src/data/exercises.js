export const exerciseLibrary = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell', description: 'Lie on a flat bench, grip the barbell slightly wider than shoulder width, lower to chest and press up.', videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', description: 'Set bench to 30-45°, press dumbbells up from chest level.', videoUrl: 'https://www.youtube.com/watch?v=8iPEnn-ltC8' },
  { id: 'cable-fly', name: 'Cable Fly', muscle: 'Chest', equipment: 'Cable', description: 'Stand between cable stations, bring handles together in front of chest with slight elbow bend.', videoUrl: 'https://www.youtube.com/watch?v=Iwe6AmxVf7o' },
  { id: 'push-up', name: 'Push Up', muscle: 'Chest', equipment: 'Bodyweight', description: 'Standard push up position, lower chest to ground and push back up.', videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4' },

  // Back
  { id: 'deadlift', name: 'Deadlift', muscle: 'Lower Back', equipment: 'Barbell', description: 'Stand with feet hip-width, grip bar, drive through heels keeping back straight.', videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q' },
  { id: 'pull-up', name: 'Pull Up', muscle: 'Lats', equipment: 'Bodyweight', description: 'Hang from bar with overhand grip, pull chin above the bar.', videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g' },
  { id: 'barbell-row', name: 'Barbell Row', muscle: 'Upper Back', equipment: 'Barbell', description: 'Hinge at hips, pull barbell to lower chest/upper belly.', videoUrl: 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle: 'Lats', equipment: 'Cable', description: 'Sit at lat pulldown machine, pull bar to upper chest.', videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc' },

  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', description: 'Press barbell from shoulders to overhead lockout.', videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell', description: 'Raise dumbbells out to sides until arms are parallel to floor.', videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo' },
  { id: 'face-pull', name: 'Face Pull', muscle: 'Traps', equipment: 'Cable', description: 'Pull rope attachment towards face, externally rotating shoulders.', videoUrl: 'https://www.youtube.com/watch?v=rep-qVOkqgk' },

  // Legs
  { id: 'squat', name: 'Barbell Squat', muscle: 'Quadriceps', equipment: 'Barbell', description: 'Bar on upper back, squat down until thighs are parallel, stand back up.', videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8' },
  { id: 'leg-press', name: 'Leg Press', muscle: 'Quadriceps', equipment: 'Machine', description: 'Sit in leg press machine, press platform away by extending legs.', videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Barbell', description: 'Hinge at hips with slight knee bend, lower bar along legs.', videoUrl: 'https://www.youtube.com/watch?v=jEy_czb3RKA' },
  { id: 'leg-curl', name: 'Leg Curl', muscle: 'Hamstrings', equipment: 'Machine', description: 'Lie face down, curl weight towards glutes.', videoUrl: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs' },
  { id: 'calf-raise', name: 'Calf Raise', muscle: 'Calves', equipment: 'Machine', description: 'Stand on platform edge, raise heels as high as possible.', videoUrl: 'https://www.youtube.com/watch?v=gwLzBJYoWlI' },
  { id: 'lunge', name: 'Lunge', muscle: 'Quadriceps', equipment: 'Dumbbell', description: 'Step forward, lower back knee towards ground, push back to start.', videoUrl: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U' },

  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', muscle: 'Biceps', equipment: 'Barbell', description: 'Curl barbell from thighs to shoulders with strict form.', videoUrl: 'https://www.youtube.com/watch?v=kwG2ipFRgFo' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscle: 'Triceps', equipment: 'Cable', description: 'Push cable attachment down until arms are fully extended.', videoUrl: 'https://www.youtube.com/watch?v=2-LAMcpzODU' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscle: 'Biceps', equipment: 'Dumbbell', description: 'Curl dumbbells with neutral grip (palms facing each other).', videoUrl: 'https://www.youtube.com/watch?v=zC3nLlEvin4' },
  { id: 'skull-crusher', name: 'Skull Crusher', muscle: 'Triceps', equipment: 'Barbell', description: 'Lie on bench, lower barbell to forehead then extend arms.', videoUrl: 'https://www.youtube.com/watch?v=d_KZxkY_0cM' },

  // Core
  { id: 'plank', name: 'Plank', muscle: 'Core', equipment: 'Bodyweight', description: 'Hold push-up position on forearms, keep body straight.', videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscle: 'Core', equipment: 'Cable', description: 'Kneel facing cable, crunch down bringing elbows to knees.', videoUrl: 'https://www.youtube.com/watch?v=AV5PmrFDEMg' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscle: 'Core', equipment: 'Bodyweight', description: 'Hang from bar, raise legs to parallel or higher.', videoUrl: 'https://www.youtube.com/watch?v=hdng3Nm1x_E' },
];

export const muscleGroups = [
  'Chest', 'Shoulders', 'Traps',
  'Upper Back', 'Lats', 'Lower Back',
  'Biceps', 'Triceps', 'Forearms',
  'Core', 'Glutes',
  'Quadriceps', 'Hamstrings', 'Calves',
];
export const equipmentTypes = ['Barbell', 'Dumbbell', 'Kettlebell', 'Cable', 'Machine', 'Bodyweight', 'Other'];
