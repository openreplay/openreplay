import Record from 'Types/Record';

export default Record({
  id: undefined,
  color: undefined,
  description: '',
  name: undefined,
  iconUrl: undefined
}, {
  fromJS: ({ iconUrl, color, ...issueType }) => ({
    ...issueType,
    color,
    iconUrl: iconUrl ? 
      <img className="mr-2" src={ iconUrl } width="13" height="13" /> :
      <div className="mr-2 w-2 h-2 rounded-full float-left" style={{ backgroundColor: `#${color}`}} />,
  }),
})
