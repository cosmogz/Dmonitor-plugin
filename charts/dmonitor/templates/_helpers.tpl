{{- define "dmonitor.name" -}}
{{- default "dmonitor" .Chart.Name -}}
{{- end -}}

{{- define "dmonitor.fullname" -}}
{{- printf "%s" (include "dmonitor.name" .) -}}
{{- end -}}
