# PlugPag Service Wrapper (homologação PagBank)
-keep class br.com.uol.pagseguro.plugpagservice.** { *; }
-keepclassmembers class br.com.uol.pagseguro.plugpagservice.** { *; }

# Compose / Kotlin
-keep class com.smartpos.parking.** { *; }
-dontwarn br.com.uol.pagseguro.**

# security-crypto / Tink
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-keep class androidx.security.crypto.** { *; }
-keep class com.google.crypto.tink.** { *; }
