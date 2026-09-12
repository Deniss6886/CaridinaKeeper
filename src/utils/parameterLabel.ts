import type { TFunction } from 'i18next';
import type { ParameterDefinition } from '../domain/models';

export function parameterLabel(parameter: ParameterDefinition | undefined, t: TFunction): string {
  if (!parameter) return t('common.unknown');
  return parameter.isBuiltIn
    ? t(`parameters.${parameter.key}`, { defaultValue: parameter.name })
    : parameter.name;
}
