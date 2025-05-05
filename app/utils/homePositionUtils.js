export const HOME_POSITIONS = {
    '3oclock': 0,
    '6oclock': Math.PI / 2,
    '9oclock': Math.PI,
    '12oclock': (3 * Math.PI) / 2,
  };
  
  export function getHomeAngleRadians(position = '3oclock') {
    return HOME_POSITIONS[position] ?? 0;
  }

  