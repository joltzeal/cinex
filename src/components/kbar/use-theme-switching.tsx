import { useRegisterActions } from 'kbar';
import { useTheme } from 'next-themes';

const useThemeSwitching = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const themeAction = [
    {
      id: 'toggleTheme',
      name: '切换主题',
      shortcut: ['t', 't'],
      section: 'Theme',
      perform: toggleTheme
    },
    {
      id: 'setLightTheme',
      name: 'Light',
      section: 'Theme',
      perform: () => setTheme('light')
    },
    {
      id: 'setDarkTheme',
      name: 'Dark',
      section: 'Theme',
      perform: () => setTheme('dark')
    }
  ];

  useRegisterActions(themeAction, [theme]);
};

export default useThemeSwitching;
