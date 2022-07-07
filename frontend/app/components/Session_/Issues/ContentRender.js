import React from 'react';
import stl from './contentRender.module.css';
import Highlight from 'react-highlight'

const elType = {
    PARAGRAPH: 'paragraph',
    TEXT: 'text',
    QUOTE: 'blockquote',
    CODE_BLOCK: 'codeBlock',
    MENTION: 'mention',
    RULE: 'rule',
    HARD_BREAK: 'hardBreak',
}

const renderElement = (el, provider) => {
    if (provider === 'github')
        return el
    
    switch(el.type) {
        case elType.PARAGRAPH:
            return <p className={ stl.para }><ContentRender message={ el } /></p>;
        case elType.QUOTE:
            return <blockquote className={ stl.quote }><ContentRender message={ el } /></blockquote>;
        case elType.CODE_BLOCK:
            return <Highlight className={ stl.codeMirror } language={ el.attrs.language || '' }>{ codeRender(el.content)[0] }</Highlight>;
            // return <CodeMirror
            //     className={ stl.codeMirror }
            //     value={ codeRender(el.content)[0] }
            //     options={{
            //         mode: el.attrs.language || '',
            //         theme: 'material',
            //         lineNumbers: true,
            //         readOnly: true,
            //         showCursorWhenSelecting: false,
            //         scroll: true
            //     }}
            // />
        case elType.MENTION:
            return <span className={ stl.mention }>{ `@${el.attrs.text}` }</span>;
        case elType.RULE:
            return <hr className={ stl.rule } />
        case elType.HARD_BREAK:
            return <br />
        case elType.RULE:
            return <hr className={ stl.rule } />
        case elType.TEXT:
            return el.text;
    }
    return <ContentRender key={el.text} message={ el } />;
}

const codeRender = (content) => content.map(el => el.text);

const ContentRender = props => {
    const { message, provider } = props;
    return (
        <React.Fragment>
            { provider === 'github' ? message : 
                message && message.content && message.content.map(el => (
                    <React.Fragment>{ renderElement(el, provider) }</React.Fragment>
                ))
            }
        </React.Fragment>
    );
};

export default ContentRender;
