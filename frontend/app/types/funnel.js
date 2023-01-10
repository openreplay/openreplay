import Record from 'Types/Record';
import Filter from 'Types/filter';
// import { validateURL, validateName } from 'App/validate';

const getRedableName = ({ type, value, operator }) => {
  let str = '';
  switch (type) {
    case "LOCATION":
      str = 'Visited URL';
      break;
    case "CLICK":
      str = 'Clicked'
      break;
    case "INPUT":
      str = 'Entered';
      break;
    case "CUSTOM":
      str = 'Custom Event';
      break;
  }

  return `${str} ${operator}`;
}

export default Record({
  funnelId: undefined,
  projectId: undefined,
  userId: undefined,
  name: '',
  stages: [],
  filter: Filter(),
  createdAt: undefined,
  sessionsCount: 0,
  criticalIssuesCount: undefined,
  conversions: 0,
  stepsCount: 0,
  isPublic: false,
  affectedUsers: 0,
  lostConversions: 0,
  conversionImpact: 0,
  firstStage: '',
  lastStage: '',
  totalDropDueToIssues: 0
}, {
  idKey: 'funnelId',
  methods: {
    validate() {
      return true;
    },
    toData() {
      const js = this.toJS();      
      return js;
    }
  },
  fromJS: ({ stages = [], filter,  activeStages = null, ...rest }) => {
    let _stages  = stages.map((stage, index) => {
      stage.headerText = getRedableName(stage.type, stage.value);
      stage.label = `Step ${index + 1}`;
      return stage;
    });
    
    let firstStage = _stages.length > 0 ? _stages[0] : {};
    let lastStage = _stages ? _stages[_stages.length - 1] : {};
    
    if (activeStages && activeStages.length === 2) {
      firstStage = _stages[activeStages[0]];
      lastStage = _stages[activeStages[1]];
    }
    
    const affectedUsers = firstStage.usersCount ? firstStage.usersCount - lastStage.usersCount : 0;
    const lostConversions = rest.totalDropDueToIssues;
    const conversionImpact = lostConversions ? Math.round((lostConversions / firstStage.sessionsCount) * 100) : 0;

    return {
      ...rest,
      stages: _stages.length > 0 ? _stages.map((stage, index) => {
        if (!stage) return;
        stage.headerText = getRedableName(stage);
        stage.label = `Step ${index + 1}`;
        return stage;
      }) : [],
      affectedUsers,
      lostConversions,
      conversionImpact,
      // firstStage: firstStage && firstStage.label + ' ' + truncate(firstStage.value || '', 10) || '',
      // lastStage: lastStage && lastStage.label + ' ' + truncate(lastStage.value || '', 10) || '',
      firstStage: firstStage && firstStage.label || '',
      lastStage: lastStage && lastStage.label || '',
      filter: Filter(filter),
      sessionsCount: lastStage && lastStage.sessionsCount,
      stepsCount: stages ? stages.length : 0,
      conversions: 100 - conversionImpact
    }
  }
});
