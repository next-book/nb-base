import { combineReducers } from 'redux';
import navigation from './components/navigation-reducer';
import manifest from './components/manifest-reducer';
import trace from './components/trace-reducer';
import offline from './components/offline-reducer';

module.exports = combineReducers({
  navigation,
  manifest,
  trace,
  offline,
});
