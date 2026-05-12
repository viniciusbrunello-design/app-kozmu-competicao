export interface AchievementMeta {
  id: string;
  emoji: string;
  title: string;
  desc: string;
}

export const ACHIEVEMENTS_META: AchievementMeta[] = [
  { id: 'first_post',  emoji: '📸', title: 'Primeira Pub.',    desc: 'Registrou seu primeiro conteúdo' },
  { id: 'streak_7',   emoji: '🔥', title: 'Semana de Fogo',   desc: '7 dias consecutivos publicando' },
  { id: 'streak_14',  emoji: '⚡', title: 'Duas Semanas',     desc: '14 dias de streak' },
  { id: 'streak_30',  emoji: '🌟', title: 'Mês Incrível',     desc: '30 dias sem parar' },
  { id: 'posts_50',   emoji: '🚀', title: 'Prolífico',        desc: '50 publicações validadas' },
  { id: 'champion',   emoji: '🏆', title: 'Campeão',          desc: 'Venceu um ciclo de grupo' },
  { id: 'challenger', emoji: '🎯', title: 'Desafiador',       desc: 'Completou um desafio' },
  { id: 'social',     emoji: '👥', title: 'Em Órbita',        desc: 'Faz parte de um grupo' },
];
