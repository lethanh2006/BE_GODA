import { DefaultNamingStrategy } from 'typeorm';

const snakeCase = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/** Cột trong database dùng snake_case (questionId → question_id), thuộc tính entity vẫn camelCase. */
export class SnakeNamingStrategy extends DefaultNamingStrategy {
  override columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]) {
    return customName ?? snakeCase([...embeddedPrefixes, propertyName].join('_'));
  }

  override joinColumnName(relationName: string, referencedColumnName: string) {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }
}
