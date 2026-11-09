import { useCallback } from 'react';
import { LOCALES, useLanguage, useMessages } from '../../../i18n';
import type { CardTodo } from '../../../services/admin';
import { adminMessages } from '../messages/admin';

/** ['letter', 'riddle'] -> "the letter and the riddle" (in the site language). */
export function useTodoText() {
  const labels = useMessages(adminMessages).todos;
  const language = useLanguage();
  return useCallback(
    (todos: readonly CardTodo[]) =>
      new Intl.ListFormat(LOCALES[language], { type: 'conjunction' }).format(todos.map((todo) => labels[todo])),
    [labels, language],
  );
}
