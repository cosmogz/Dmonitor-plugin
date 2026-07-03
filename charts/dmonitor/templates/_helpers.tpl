{{- define "dmonitor.name" -}}
{{- default .Chart.Name .Values.nameOverride -}}
{{- end -}}

{{- define "dmonitor.fullname" -}}
{{- printf "%s-%s" (include "dmonitor.name" .) .Release.Name -}}
{{- end -}}
