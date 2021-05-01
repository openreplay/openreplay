import Record from 'Types/Record';

export default Record({
  id: undefined,
  avatarUrls: undefined,
  name: undefined,
}, {
  fromJS: author => ({
    ...author,
  })
})
