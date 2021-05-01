import styles from './videoTab.css';

export default ({ src, className }) => (
  <div className={ className }>
    <video src={ src } className={ styles.video } controls>
      {'Sorry, your browser doesn\'t support embedded videos, but don\'t worry, you can '}
      <a href={ src }>{'download it'}</a>
      {'and watch it with your favorite video player!'}
    </video>
  </div>
);
