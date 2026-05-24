class DrawerState {
    activeDrawers = $state(0)
}

const drawerState = new DrawerState();

export function getDrawerState(){
    return drawerState
}