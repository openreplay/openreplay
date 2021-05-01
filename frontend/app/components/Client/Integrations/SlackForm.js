import IntegrationForm from './IntegrationForm'; 
import SlackAddForm from './SlackAddForm';
import SlackChannelList from './SlackChannelList/SlackChannelList';

const SlackForm = (props) => {
  const { onEdit } = props;
  return (
    <>
      <SlackChannelList onEdit={onEdit} />
    </>
  )
}

SlackForm.displayName = "SlackForm";

export default SlackForm;