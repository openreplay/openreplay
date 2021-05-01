export default [ 0, dataMax => {
	if (dataMax === 0) return 10;
  if (dataMax > 100 || dataMax < 0) return dataMax;
  return dataMax * (5.7 - Math.log(dataMax));
} ];