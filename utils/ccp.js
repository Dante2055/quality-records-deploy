const kojiLimits = {
  temperatureMax: 40,
  humidityMin: 60,
  humidityMax: 100,
  label: "温度 ≤ 40℃；湿度 60% - 100%"
};

function isKojiRecord(record) {
  if (!record) return false;
  if (record.templateSlug === "koji-making-record") return true;
  const data = record.data || {};
  return record.templateSlug === "critical-control-point-record" && String(data.controlPointName || "").includes("制曲");
}

function isKojiValues(values = {}) {
  return String(values.controlPointName || "").includes("制曲");
}

function evaluateKoji(values = {}) {
  const temperature = Number(values.temperature);
  const humidity = Number(values.humidity);
  const tempOk = !Number.isNaN(temperature) && temperature <= kojiLimits.temperatureMax;
  const humidityOk = !Number.isNaN(humidity) && humidity >= kojiLimits.humidityMin && humidity <= kojiLimits.humidityMax;
  return {
    tempOk,
    humidityOk,
    ok: tempOk && humidityOk
  };
}

function kojiWarning(values = {}) {
  if (!isKojiValues(values)) return "";
  const temperature = Number(values.temperature);
  const humidity = Number(values.humidity);
  const messages = [];
  if (values.temperature !== "" && !Number.isNaN(temperature) && temperature > kojiLimits.temperatureMax) {
    messages.push(`温度超过 ${kojiLimits.temperatureMax}℃`);
  }
  if (values.humidity !== "" && !Number.isNaN(humidity) && (humidity < kojiLimits.humidityMin || humidity > kojiLimits.humidityMax)) {
    messages.push(`湿度不在 ${kojiLimits.humidityMin}% - ${kojiLimits.humidityMax}% 范围`);
  }
  return messages.join("，");
}

module.exports = {
  kojiLimits,
  isKojiRecord,
  isKojiValues,
  evaluateKoji,
  kojiWarning
};
