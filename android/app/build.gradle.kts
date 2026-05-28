plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.smartpos.parking"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.smartpos.parking"
        // Homologação PagBank SmartPOS: minSdk 23 obrigatório
        minSdk = 23
        // minSdk 23 exigido PagBank; targetSdk alto evita lint e mantém compatibilidade terminal
        targetSdk = 33
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "PLUGPAG_APP_NAME", "\"SmartPos Parking\"")
        buildConfigField("String", "PLUGPAG_APP_VERSION", "\"$versionName\"")
        buildConfigField("String", "API_BASE_URL", "\"https://estacionamento.aplopes.com/api/\"")
        buildConfigField("boolean", "USE_MOCK_REPOSITORY", "false")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    buildTypes {
        debug {
            isDebuggable = true
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            buildConfigField("boolean", "USE_MOCK_REPOSITORY", "false")
            // Desenvolvimento local (emulador → host): descomente a linha abaixo
            // buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3085/api/\"")
        }
        release {
            // R8 pode ser habilitado após validar regras; homologação exige APK funcional assinado
            isMinifyEnabled = false
            isShrinkResources = false
            isDebuggable = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.security:security-crypto:1.1.0")

    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.8.4")

    // WrapperPPS exclusivo — homologação PagBank SmartPOS
    implementation("br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.11.0")
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")

    // Apenas debug — não entra no APK de homologação/produção
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    debugImplementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
}

// Bloqueia dependências proibidas em homologação (Google Play Services)
configurations.configureEach {
    exclude(group = "com.google.android.gms")
    exclude(group = "com.google.firebase")
}
