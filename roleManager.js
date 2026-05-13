const ROLE_PRIORITY = {
  admin: 1,
  teamlead: 2,
  developer: 3,
  employee: 4,
  intern: 5
};

function getBranchWeight(branch) {

  if (branch === 'main' || branch === 'master')
    return 0;

  if (branch === 'develop')
    return 1;

  if (branch.startsWith('testing'))
    return 2;

  if (branch.startsWith('feature'))
    return 3;

  return 4;
}

function calculatePriority(role, branch) {

  const roleValue =
    ROLE_PRIORITY[role?.toLowerCase()] || 5;

  return roleValue + getBranchWeight(branch);
}

module.exports = {
  calculatePriority
};