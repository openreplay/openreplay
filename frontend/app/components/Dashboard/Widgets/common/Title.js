import styles from './title.css';

const Title = ({ title, sub }) => (
  <div className={ styles.title } >
    <h4>{ title }</h4>
    <span>{ sub }</span>
  </div>
);

Title.displayName = 'Title';

export default Title;
