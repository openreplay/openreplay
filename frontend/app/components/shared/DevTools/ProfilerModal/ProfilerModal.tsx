import React from 'react';

interface Props {
  profile: any;
}
function ProfilerModal(props: Props) {
  const {
    profile: { name, args, result },
  } = props;

  return (
    <div className="bg-white overflow-y-auto h-screen p-5" style={{ width: '500px' }}>
      <h5 className="mb-2 text-2xl">{name}</h5>
      <h5 className="py-3">{'Arguments'}</h5>
      <ul className="color-gray-medium">
        {args.split(',').map((arg: any) => (
          <li> {`${arg}`} </li>
        ))}
      </ul>
      <h5 className="py-3">{'Result'}</h5>
      <div className="color-gray-medium">{`${result}`}</div>
    </div>
  );
}

export default ProfilerModal;
