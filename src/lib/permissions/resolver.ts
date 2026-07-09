export interface ModuleOverride {
  module_key: string;
  access_type: 'grant' | 'deny';
}

/**
 * Computes effective module permissions based on role defaults, user module overrides, and static rules.
 * Rule: 'my' module is ALWAYS available to every user.
 */
export function resolveEffectiveModules(
  defaultModules: string[],
  overrides: ModuleOverride[]
): string[] {
  const denied = new Set(
    overrides.filter((o) => o.access_type === 'deny').map((o) => o.module_key)
  );
  const granted = new Set(
    overrides.filter((o) => o.access_type === 'grant').map((o) => o.module_key)
  );

  const resolved = new Set<string>();

  // Add default modules that are not denied
  for (const mod of defaultModules) {
    if (!denied.has(mod)) {
      resolved.add(mod);
    }
  }

  // Add explicitly granted overrides
  for (const mod of granted) {
    resolved.add(mod);
  }

  // Enforce 'my' is always present
  resolved.add('my');

  return Array.from(resolved);
}

/**
 * Validates if the user has access to a specific module.
 */
export function hasModuleAccess(
  effectiveModules: string[],
  moduleKey: string
): boolean {
  if (moduleKey === 'my' || moduleKey === 'home') return true;
  return effectiveModules.includes(moduleKey);
}
