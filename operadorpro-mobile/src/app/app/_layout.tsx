import { Tabs } from 'expo-router';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#d4a574',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
        headerTitleStyle: { fontSize: 18, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '📊 Panel',
          tabBarLabel: 'Panel',
          headerTitle: '📊 OperadorPro',
        }}
      />
      <Tabs.Screen
        name="carta-porte"
        options={{
          title: '📋 Carta Porte',
          tabBarLabel: 'Carta Porte',
          headerTitle: '📋 Carta Porte 3.1',
        }}
      />
      <Tabs.Screen
        name="inspeccion"
        options={{
          title: '✅ Inspección',
          tabBarLabel: 'Inspección',
          headerTitle: '✅ Inspección Pre-Viaje',
        }}
      />
      <Tabs.Screen
        name="cobranza"
        options={{
          title: '💰 Cobranza',
          tabBarLabel: 'Cobranza',
          headerTitle: '💰 Cobranza de Fletes',
        }}
      />
      <Tabs.Screen
        name="flota"
        options={{
          title: '🚚 Flota',
          tabBarLabel: 'Flota',
          headerTitle: '🚚 Mi Flota',
        }}
      />
    </Tabs>
  );
}
