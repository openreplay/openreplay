import React from 'react';
import cn from 'classnames';

const AuthorAvatar = ({ className, imgUrl, width = 32, height = 32 }) => {
    return (
        <div className={ cn(className, "img-crcle")}>
            <img src={ imgUrl } alt="" width={ width } height={ height } />
        </div>
    );
};

export default AuthorAvatar;
