// App.js
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import MainScreen from './screen/mainscreen'; // Adjust path if needed
import MainScreen2 from './screen/MainScreen2'; // Adjust path if needed

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* <Stack.Screen name="MainScreen" component={MainScreen} /> */}
        <Stack.Screen name="MainScreen2" component={MainScreen2} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
