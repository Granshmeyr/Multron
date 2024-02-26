export const main: Electron.MenuItemConstructorOptions[] = [
    {
        label: 'Custom Menu',
        submenu: [
            {
                label: 'Custom Entry  1',
                click: () => {
                    console.log('Custom Entry  1 clicked');
                }
            },
            {
                label: 'Custom Entry  2',
                click: () => {
                    console.log('Custom Entry  2 clicked');
                }
            }
        ]
    }
];