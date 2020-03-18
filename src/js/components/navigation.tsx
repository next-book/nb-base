import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { IState as ICombinedState } from '../reducer';
import { throttle } from 'lodash';
import keycode from 'keycode';

import { withTranslation, WithTranslation } from 'react-i18next';

import { getChapterNum } from '../shared';
import { initSwipeNav } from '../swipe-nav';
import { NavBar } from './nav-bar';
import { TopBar } from './top-bar';
import GoTo from './go-to';
import { CatchWord } from './catch-word';
import { SeqReturn, Sequential } from './seq-return';
import { reducer, IPosition, INavDocument, IConfig } from './position-reducer';
import { IState as IManifest, IDocument } from './manifest-reducer';
import { reducer as peeksReducer, IPeek } from './peeks-reducer';

import Toc from './toc';

export enum Direction {
  Back = 'back',
  Forward = 'forward',
}

enum Position {
  Bottom = 'bottom',
  Top = 'top',
}

export interface IProps extends WithTranslation {
  manifest: IManifest;
  config: IConfig;
  scrollRatio: number;
  position: IPosition | null;
  sequentialPosition: IPosition | null;
  readingOrder: INavDocument[];
  sequential: Sequential;
  setPosition(chapterNum: number, idea: number, chapterEnd: boolean, sequential: Sequential): void;
  setScrollRatio(scrollRatio: number): void;
  setReadingOrder(documents: IDocument[]): void;
  addPeek(peek: IPeek): void;
}

export interface IState {
  barHeight: IPosDouble | null;
  windowHeight: number | null;
  zonePadding: IPosDouble;
  readingZone: IPosDouble;
  lastScrollStart: number | null;
}

export type IPosDouble = {
  [Position.Top]: number;
  [Position.Bottom]: number;
};

export class Navigation extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      barHeight: null,
      windowHeight: null,
      zonePadding: { [Position.Top]: 12, [Position.Bottom]: 8 * 6 },
      readingZone: { [Position.Top]: 0, [Position.Bottom]: 0 },
      lastScrollStart: null,
    };
  }

  private isChapter = getChapterNum() !== null;

  setPosition = (resetSequence?: boolean) => {
    const idea = getFirstIdeaShown();
    const chapterNum = getChapterNum();
    const chapterEnd = isPageScrolledToBottom();
    if (chapterNum === null || idea === null) return;

    const sequential = resetSequence
      ? Sequential.Yes
      : checkSequence(
          this.props.sequentialPosition,
          { idea, chapterNum, chapterEnd },
          this.props.sequential,
          this.getScrollStep,
          true
        );

    this.props.setPosition(chapterNum, idea, chapterEnd, sequential);

    setUriIdea(idea);
  };

  setScrollRatio = () => {
    this.props.setScrollRatio(getScrollRatio());
  };

  collapseBars = () => {
    if (this.state.barHeight === null) return;
    const ms = new Date().getTime();

    if (this.state.lastScrollStart === null) {
      this.setState({ ...this.state, lastScrollStart: ms });
      return;
    }

    if (ms - this.state.lastScrollStart < 150) return;

    if (ms - this.state.lastScrollStart < 250) {
      this.setState({ ...this.state, barHeight: null, lastScrollStart: null });
      return;
    }

    this.setState({ ...this.state, lastScrollStart: null });
  };

  displayPaginated = () => {
    this.collapseBars();

    if (this.state.barHeight !== null) document.body.classList.add('paginated');
    else document.body.classList.remove('paginated');
  };

  getScrollHandler = () => {
    const t1 = throttle(this.setPosition, 500, { leading: false });
    const t2 = throttle(this.setScrollRatio, 100, { leading: true });
    const t3 = throttle(this.displayPaginated, 100, { leading: true });

    return function throttled() {
      t1();
      t2();
      t3();
    };
  };

  handleKeyboardNav = (event: KeyboardEvent) => {
    if (this.props.position === null) return;
    if (document.activeElement !== document.body || document.activeElement === null) return;

    const chapter = this.props.readingOrder[this.props.position.chapterNum];

    switch (keycode(event)) {
      case 'left':
        return this.goBack(event, chapter.prev, false);
      case 'right':
        return this.goForward(event, chapter.next, false);
      default:
        return;
    }
  };

  handleSwipeNav = (event: TouchEvent, dir: Direction) => {
    if (this.props.position === null) return;
    const chapter = this.props.readingOrder[this.props.position.chapterNum];

    if (dir === Direction.Forward) {
      this.goForward(event, chapter.next, false);
    } else if (dir === Direction.Back) {
      this.goBack(event, chapter.prev, false);
    }
  };

  handleInvisibleNav = (event: MouseEvent) => {
    if (this.props.position === null) return;

    const chapter = this.props.readingOrder[this.props.position.chapterNum];
    const target = event.target as HTMLElement;

    if (
      target.tagName != 'A' &&
      target.tagName != 'BUTTON' &&
      target.tagName != 'INPUT' &&
      target.tagName != 'LABEL' &&
      !target.classList.contains('ui-target') &&
      target.closest('A') === null &&
      target.closest('LABEL') === null &&
      target.closest('.ui-target') === null
    ) {
      if (isInPaginationRect(Direction.Back, event.clientX, event.clientY)) {
        return this.goBack(event, chapter.prev);
      } else if (isInPaginationRect(Direction.Forward, event.clientX, event.clientY)) {
        return this.goForward(event, chapter.next);
      }
    }
  };

  setSizes = () => {
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;

    this.setState(
      {
        ...this.state,
        windowHeight,
        readingZone: {
          [Position.Top]: this.state.zonePadding[Position.Top],
          [Position.Bottom]: windowHeight - this.state.zonePadding[Position.Bottom],
        },
      },
      this.setPaddings
    );
  };

  goForward = (
    event: MouseEvent | TouchEvent | KeyboardEvent,
    nextChapter: string | null,
    showButtons?: boolean
  ) => {
    event.preventDefault();

    if (!isPageScrolledToBottom()) {
      pageForward(nextChapter, this.getScrollStep(), showButtons);
      this.setPaddings();
    } else if (nextChapter) window.location.assign(`${nextChapter}#chunk1`);
  };

  goBack = (
    event: MouseEvent | TouchEvent | KeyboardEvent,
    prevChapter: string | null,
    showButtons?: boolean
  ) => {
    event.preventDefault();

    if (!isPageScrolledToTop()) {
      pageBack(prevChapter, this.getScrollStep(), showButtons);
      this.setPaddings();
    } else if (prevChapter) window.location.assign(`${prevChapter}#chapter-end`);
  };

  setPaddings = () => {
    if (this.state.windowHeight === null) return;

    this.setState({
      ...this.state,
      barHeight: {
        [Position.Top]: calcCutoff(Position.Top, this.state.readingZone),
        [Position.Bottom]:
          this.state.windowHeight - calcCutoff(Position.Bottom, this.state.readingZone),
      },
    });
  };

  getScrollStep = (): number | null => {
    if (this.state.windowHeight === null) return null;
    return (
      this.state.windowHeight -
      this.state.zonePadding[Position.Top] -
      (this.state.barHeight === null ? 80 : this.state.barHeight[Position.Bottom]) -
      5
    );
  };

  showToc = () => {
    const pos: IPosition =
      this.props.position !== null
        ? this.props.position
        : {
            idea: 0,
            chapterNum: 0,
            chapterEnd: false,
          };

    this.props.addPeek({
      content: <Toc idea={pos.idea} chapterNum={pos.chapterNum} />,
      title: this.props.t('toc'),
      source: 'toc-table',
      showSource: false,
    });
  };

  componentDidMount() {
    window.addEventListener('scroll', this.getScrollHandler());
    if (this.props.config.keyboardNav) {
      window.document.body.addEventListener('keydown', this.handleKeyboardNav);
    }
    if (this.props.config.invisibleNav) {
      window.document.addEventListener('mousedown', this.handleInvisibleNav);
    }
    initSwipeNav(this.handleSwipeNav);

    this.props.setReadingOrder(this.props.manifest.documents);

    this.props.setScrollRatio(getScrollRatio());
    this.setPosition();

    window.addEventListener('resize', this.setSizes);
    this.setSizes();
    this.setPaddings();
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.getScrollHandler());
    if (this.props.config.keyboardNav) {
      window.document.body.removeEventListener('keydown', this.handleKeyboardNav);
    }
    if (this.props.config.invisibleNav) {
      window.document.body.removeEventListener('mousedown', this.handleInvisibleNav);
    }
  }

  render() {
    const ro = this.props.readingOrder;
    if (ro.length === 0) return null;

    const pos = this.props.position;
    const chapter = pos !== null ? ro[pos.chapterNum] : null;
    const thisChapter =
      pos !== null && this.props.sequentialPosition !== null
        ? this.props.sequentialPosition.chapterNum === pos.chapterNum
        : false;
    const { totalWords } = ro[ro.length - 1];

    const barHeight = this.state.barHeight;

    const { offset, fraction } =
      chapter !== null ? getProgress(chapter, totalWords) : { offset: 0, fraction: 0 };

    const progress = offset + fraction * this.props.scrollRatio;
    const minutesLeftInChapter = chapter
      ? countMinutesLeft(this.props.scrollRatio, chapter.words)
      : null;

    return (
      <nav>
        <CatchWord
          topBarHeight={barHeight === null ? null : barHeight[Position.Top]}
          bottomBarHeight={barHeight === null ? null : barHeight[Position.Bottom]}
          actions={{ showToc: this.showToc }}
        />
        {this.props.position && (
          <GoTo
            currentChapterNum={this.props.position.chapterNum}
            currentIdea={this.props.position.idea}
            readingOrder={this.props.readingOrder}
            progress={Math.floor(progress)}
            minutesLeft={minutesLeftInChapter}
          />
        )}
        <NavBar
          isChapter={this.isChapter}
          readingOrder={ro}
          chapter={chapter}
          scrollRatio={this.props.scrollRatio}
          totalWords={totalWords}
        />
        {chapter && <TopBar title={this.props.manifest.title} chapter={chapter} />}
        <SeqReturn
          isChapter={this.isChapter}
          thisChapter={thisChapter}
          targetChapter={
            this.props.sequentialPosition ? ro[this.props.sequentialPosition.chapterNum] : null
          }
          targetIdea={this.props.sequentialPosition ? this.props.sequentialPosition.idea : null}
          setPosition={this.setPosition}
          sequential={this.props.sequential}
          startLink={ro[0].file}
          t={this.props.t}
        />
      </nav>
    );
  }
}

function countMinutesLeft(scrollRatio: number, wordsInChapter: number) {
  const wordsPerMinute = 240;
  const left = ((1 - scrollRatio) * wordsInChapter) / wordsPerMinute;
  return left > 0 ? Math.floor(left) : 0;
}

function displayPagination(dir: Direction, showButtons?: boolean) {
  document.body.classList.add(`paginated-${dir}`);
  window.setTimeout(() => document.body.classList.remove(`paginated-${dir}`), 300);

  if (showButtons !== false) {
    document.body.classList.add(`paginated-button-${dir}`);
    window.setTimeout(() => document.body.classList.remove(`paginated-button-${dir}`), 300);
  }
}

function isPageScrolledToBottom() {
  const nextLink = document.querySelector('.end-nav a[rel="next"]');

  if (nextLink) {
    return nextLink.getBoundingClientRect().top - window.innerHeight < -50;
  }

  return window.innerHeight + Math.ceil(window.scrollY) >= document.body.scrollHeight;
}

function isPageScrolledToTop(): boolean {
  const prevLink = document.querySelector('.begin-nav a[rel="prev"]');

  if (prevLink) {
    return prevLink.getBoundingClientRect().bottom > -80;
  }

  return Math.floor(window.scrollY) < 20;
}

function getScrollRatio(): number {
  return window.scrollY / (document.body.scrollHeight - window.innerHeight);
}

export function getProgress(chapter: INavDocument, totalWords: number) {
  if (!chapter || !totalWords) return { offset: 0, fraction: 0 };

  const offset = (chapter.offsetWords / totalWords) * 100;
  const fraction = (chapter.words / totalWords) * 100;

  return { offset, fraction };
}

function getFirstIdeaShown() {
  const ideas = [...document.querySelectorAll('.idea')].map(el => ({
    el,
    top: el.getBoundingClientRect().top,
    bottom: el.getBoundingClientRect().bottom,
  }));
  const shown = ideas.filter(el => el.top > 20).sort((el1, el2) => el1.bottom - el2.bottom);

  const idea = shown.length > 0 ? shown[0] : ideas[ideas.length - 1];
  const attr = idea.el.getAttribute('data-nb-ref-number');
  return attr !== null ? parseInt(attr, 10) : null;
}

const sequenceInitializer = (() => {
  let counter = 0;
  let lastPos: IPosition | null = null;

  return {
    same: (pos: IPosition | null, before: Sequential, callback: { (): number | null }) => {
      console.log('same', before, counter);
      if (before === Sequential.Initializing) {
        counter = checkSequence(lastPos, pos, before, callback) ? counter + 1 : 0;
        return counter > 10 ? Sequential.Yes : Sequential.Initializing;
      }
      lastPos = pos;
      return before;
    },
    yes: (pos: IPosition | null, before: Sequential, callback: { (): number | null }) => {
      console.log('yes', before, counter);
      if (before === Sequential.Initializing) {
        if (checkSequence(lastPos, pos, before, callback)) counter++;
        return counter > 10 ? Sequential.Yes : Sequential.Initializing;
      }
      lastPos = pos;
      return Sequential.Yes;
    },
    no: (pos: IPosition | null, before: Sequential, callback: { (): number | null }) => {
      console.log('no', before, counter);

      if (before === Sequential.Initializing) {
        counter = checkSequence(lastPos, pos, before, callback) ? counter + 1 : 0;
        return counter > 10 ? Sequential.Yes : Sequential.Initializing;
      }
      lastPos = pos;
      return Sequential.No;
    },
  };
})();

function checkSequence(
  pos1: IPosition | null,
  pos2: IPosition | null,
  wasSequentialBefore: Sequential,
  getScrollStepCallback: { (): number | null },
  initCheck?: boolean
): Sequential {
  const yes = () =>
    initCheck
      ? sequenceInitializer.yes(pos2, wasSequentialBefore, getScrollStepCallback)
      : Sequential.Yes;
  const no = () =>
    initCheck
      ? sequenceInitializer.no(pos2, wasSequentialBefore, getScrollStepCallback)
      : Sequential.No;
  const same = () =>
    initCheck
      ? sequenceInitializer.same(pos2, wasSequentialBefore, getScrollStepCallback)
      : wasSequentialBefore;

  // no info
  if (pos2 === null) return same();

  // new book
  if (pos1 === null && pos2 !== null) return yes();

  if (pos1 !== null && pos2 !== null) {
    const scrollStep = getScrollStepCallback() || window.innerHeight * 0.9;

    if (wasSequentialBefore === Sequential.Yes) {
      // new chapter
      if (pos1.chapterEnd && pos2.chapterNum - pos1.chapterNum === 1 && pos2.idea <= 3)
        return yes();

      // same chapter
      if (pos1.chapterNum === pos2.chapterNum) {
        // ~consecutive numbers
        if (Math.abs(pos2.idea - pos1.idea) < 3) return yes();

        // 1.5 scrollSteps down or up
        const idea1 = document.getElementById(`idea${pos1.idea}`);
        const idea2 = document.getElementById(`idea${pos2.idea}`);

        if (idea1 !== null && idea2 !== null) {
          const top1 = idea1.getBoundingClientRect().top;
          const top2 = idea2.getBoundingClientRect().top;

          if (Math.abs(top2 - top1) < 1.5 * scrollStep) return yes();
        } else {
          return same();
        }
      }
    } else if (pos1.chapterNum === pos2.chapterNum) {
      // is back on screen
      const idea1 = document.getElementById(`idea${pos1.idea}`);

      if (idea1 !== null) {
        const top1 = idea1.getBoundingClientRect().top;

        if (top1 > -5 && top1 < scrollStep * 0.75) return yes();
      } else {
        return same();
      }
    }
  }

  return no();
}

function setUriIdea(id: number) {
  window.history.replaceState(undefined, document.title, `#idea${id}`);
}

function isInPaginationRect(dir: Direction, x: number, y: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const rectW = w * 0.05 + 24;
  const margin = 2;

  if ((x > margin && x < margin + rectW) || (x < w - margin && x > w - margin - rectW)) {
    const backTop = h * 0.02;
    const backH = h * 0.18;

    const forwardTop = h * 0.25;
    const forwardH = h * 0.5;

    if (y > forwardTop && y < forwardTop + forwardH)
      return dir === Direction.Forward ? true : false;
    else if (y > backTop && y < backTop + backH) return dir === Direction.Back ? true : false;
  }

  return false;
}

function calcCutoff(from: Position, readingZone: IPosDouble) {
  const els = [...document.querySelectorAll('.chunk')].filter(el =>
    isElementOnTheEdge(el, readingZone[from])
  );

  if (!els.length) {
    if (window.scrollY > 30) return readingZone[from];
    else return from === Position.Top ? 0 : window.innerHeight;
  }

  const el = els[0];

  const cStyle = window.getComputedStyle(el);
  const lineHeight = parseInt(cStyle.lineHeight, 10);
  const rect = el.getBoundingClientRect();
  let height = rect[from];

  if (from === Position.Top) {
    height += parseInt(cStyle.paddingTop, 10);

    while (height < readingZone[from]) {
      height += lineHeight;
    }
  } else if (from === Position.Bottom) {
    while (height > readingZone[from]) {
      height -= lineHeight;
    }

    // cut off one-liners to prevent widows
    //if (remainingHeight <= lineHeight) {
    //  height -= remainingHeight;
    //}

    // cut two lines from n+1 long paragraph to prevent orphans
    //if (remainingHeight + lineHeight >= rect.height) {
    //  height -= lineHeight;
    //}
  }

  return height;
}

function isElementOnTheEdge(el: Element, edge: number) {
  var rect = el.getBoundingClientRect();

  return rect.top < edge && rect.bottom > edge;
}

function pageForward(nextChapter: string | null, step: number | null, showButtons?: boolean) {
  if (step === null) return;
  window.scrollTo(window.scrollX, window.scrollY + step);
  displayPagination(Direction.Forward, showButtons);
}

function pageBack(prevChapter: string | null, step: number | null, showButtons?: boolean) {
  if (step === null) return;
  window.scrollTo(window.scrollX, window.scrollY - step);
  displayPagination(Direction.Back, showButtons);
}

const mapStateToProps = (state: ICombinedState) => {
  return {
    config: state.navigation.config,
    readingOrder: state.navigation.readingOrder,
    position: state.navigation.position,
    scrollRatio: state.navigation.scrollRatio,
    sequential: state.navigation.sequential,
    sequentialPosition: state.navigation.sequentialPosition,
    manifest: state.manifest,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => {
  return bindActionCreators(
    {
      addPeek: peeksReducer.addPeek,
      setPosition: reducer.setPosition,
      setScrollRatio: reducer.setScrollRatio,
      setReadingOrder: reducer.setReadingOrder,
    },
    dispatch
  );
};

export default withTranslation('navigation')(
  connect(mapStateToProps, mapDispatchToProps)(Navigation)
);
