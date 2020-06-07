import { IAnnotationStyle } from './annotations/reducer';
import i18n from './../i18n';

const HIDE_ONBOARDING = 'nb-base/config/HIDE_ONBOARDING';
const SHOW_ONBOARDING = 'nb-base/config/SHOW_ONBOARDING';
const TOGGLE_PROGRESS_DISPLAY = 'nb-base/config/TOGGLE_PROGRESS_DISPLAY';
const SET_FONT_SIZE = 'nb-base/config/SET_FONT_SIZE';
const ADD_STYLE = 'nb-base/config/ADD_STYLE';
const UPDATE_STYLE = 'nb-base/config/UPDATE_STYLE';
const REMOVE_STYLE = 'nb-base/config/REMOVE_STYLE';

export enum ProgressKind {
  MinutesInChapter = 'displayMinutesInChapter',
  PercentRead = 'displayPercentRead',
  Position = 'displayPosition',
}

export enum ShowOnboarding {
  Disabled,
  Enabled,
  Initial,
}

export interface IState {
  showOnboarding: ShowOnboarding;

  displayMinutesInChapter: boolean;
  displayPercentRead: boolean;
  displayPosition: boolean;

  fontSize: string;
  annotationStyles: IAnnotationStyle[];

  keyboardNav: boolean;
  invisibleNav: boolean;
}

const INITIAL_STATE: IState = {
  showOnboarding: ShowOnboarding.Initial,
  displayMinutesInChapter: true,
  displayPercentRead: true,
  displayPosition: true,
  fontSize: '1',
  annotationStyles: [
    {
      color: null,
      backgroundColor: '#fdffb6',
      symbol: '✅',
      name: i18n.t('annotations:default-style-okay'),
      quick: false,
    },
    {
      color: null,
      backgroundColor: '#fdffb6',
      symbol: '🚩',
      name: i18n.t('annotations:default-style-red-flag'),
      quick: false,
    },
    {
      color: null,
      backgroundColor: '#fdffb6',
      symbol: '😳',
      name: i18n.t('annotations:default-style-omg'),
      quick: false,
    },
    {
      color: null,
      backgroundColor: '#eeeeee',
      symbol: '◽',
      name: i18n.t('annotations:default-style-neutral'),
      quick: true,
    },
  ],
  keyboardNav: true,
  invisibleNav: true,
};

export function reducer(state: IState = INITIAL_STATE, action: Actions) {
  switch (action.type) {
    case SHOW_ONBOARDING:
      return { ...state, ...{ showOnboarding: ShowOnboarding.Enabled } };
    case ADD_STYLE:
      return addStyle(state, action.payload);
    case UPDATE_STYLE:
      return updateStyle(state, action.payload);
    case REMOVE_STYLE:
      return removeStyle(state, action.payload);
    case HIDE_ONBOARDING:
      return { ...state, ...{ showOnboarding: ShowOnboarding.Disabled } };
    case TOGGLE_PROGRESS_DISPLAY:
      return {
        ...state,
        ...{ [action.payload]: !state[action.payload] },
      };
    case SET_FONT_SIZE:
      return { ...state, ...{ fontSize: action.payload.size } };
    default:
      return state;
  }
}

function addStyle(state: IState, style: IAnnotationStyle) {
  const annotationStyles = [...state.annotationStyles, style];
  return { ...state, annotationStyles };
}

function updateStyle(state: IState, payload: { index: number; style: IAnnotationStyle }) {
  const annotationStyles = [...state.annotationStyles];
  annotationStyles[payload.index] = payload.style;
  return { ...state, annotationStyles };
}

function removeStyle(state: IState, index: number) {
  const annotationStyles = [...state.annotationStyles];
  delete annotationStyles[index];
  return { ...state, annotationStyles };
}

reducer.showOnboarding = function() {
  return <const>{
    type: SHOW_ONBOARDING,
  };
};

reducer.hideOnboarding = function() {
  return <const>{
    type: HIDE_ONBOARDING,
  };
};

reducer.toggleDisplay = function(kind: ProgressKind) {
  return <const>{
    type: TOGGLE_PROGRESS_DISPLAY,
    payload: kind,
  };
};

reducer.setFontSize = function(size: string) {
  return <const>{
    type: SET_FONT_SIZE,
    payload: { size },
  };
};

reducer.updateStyle = function(index: number, style: IAnnotationStyle) {
  return <const>{
    type: UPDATE_STYLE,
    payload: { index, style },
  };
};

reducer.addStyle = function(style: IAnnotationStyle) {
  return <const>{
    type: ADD_STYLE,
    payload: style,
  };
};

reducer.removeStyle = function(index: number) {
  return <const>{
    type: REMOVE_STYLE,
    payload: index,
  };
};

export type Actions = ReturnType<
  | typeof reducer.showOnboarding
  | typeof reducer.hideOnboarding
  | typeof reducer.toggleDisplay
  | typeof reducer.setFontSize
  | typeof reducer.updateStyle
  | typeof reducer.addStyle
  | typeof reducer.removeStyle
>;
