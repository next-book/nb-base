import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { IState as ICombinedState } from '../reducer';
import { IToc, DocRole } from './manifest-reducer';
import { INavDocument } from './position-reducer';
import docInfo from '../doc-info';
import { withTranslation, WithTranslation } from 'react-i18next';

interface IProps extends WithTranslation {
  idea: number | null;
  readingOrder: INavDocument[];
}

class Toc extends React.Component<IProps> {
  render() {
    return (
      <>
        <ul>
          <li>
            <a
              className={docInfo.role === DocRole.Index ? 'current-chapter' : undefined}
              href={docInfo.links.index}
            >
              {this.props.t('title-page')}
            </a>
          </li>
        </ul>
        <ol>
          {this.props.readingOrder.map(doc => {
            const current = doc.order === docInfo.order;

            return (
              <li key={doc.order !== null ? doc.order : ''}>
                <a className={current ? 'current-chapter' : undefined} href={doc.file}>
                  {doc.title}
                </a>

                {doc.toc && doc.toc[0].children.length ? (
                  <ol>
                    {' '}
                    {doc.toc[0].children.map((section, index) => {
                      return <Section key={index} file={doc.file} section={section} />;
                    })}{' '}
                  </ol>
                ) : null}
              </li>
            );
          })}
        </ol>
        {docInfo.links.colophon && (
          <ul>
            <li>
              <a
                className={docInfo.role === DocRole.Colophon ? 'current-chapter' : undefined}
                href={docInfo.links.colophon}
              >
                {this.props.t('colophon')}
              </a>
            </li>
          </ul>
        )}
      </>
    );
  }
}

interface ISectionProps {
  file: string;
  section: IToc;
}

function Section(props: ISectionProps) {
  return (
    <li>
      <a href={`${props.file}#${props.section.id}`}>{props.section.name}</a>
    </li>
  );
}

const mapStateToProps = (state: ICombinedState) => {
  return {
    readingOrder: state.position.readingOrder,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => {
  return bindActionCreators({}, dispatch);
};

export default withTranslation('navigation')(connect(mapStateToProps, mapDispatchToProps)(Toc));
