{{- define "dmonitor.name" -}}
{{- default .Chart.Name .Values.nameOverride -}}
{{- end -}}

{{- define "dmonitor.fullname" -}}
{{- printf "%s-%s" (include "dmonitor.name" .) .Release.Name -}}
{{- end -}}
{{- define "dmonitor.name" -}}
{{- default "dmonitor" .Chart.Name -}}
{{- end -}}

{{- define "dmonitor.fullname" -}}
{{- printf "%s" (include "dmonitor.name" .) -}}
{{- end -}}
