package com.smartpos.parking.data.api

import com.smartpos.parking.data.security.SecureStore

class AuthTokenStore(private val secureStore: SecureStore) {

    var accessToken: String?
        get() = secureStore.getString(KEY_ACCESS_TOKEN)
        set(value) {
            if (value == null) secureStore.remove(KEY_ACCESS_TOKEN)
            else secureStore.putString(KEY_ACCESS_TOKEN, value)
        }

    var tenantSlug: String?
        get() = secureStore.getString(KEY_TENANT_SLUG)
        set(value) {
            if (value == null) secureStore.remove(KEY_TENANT_SLUG)
            else secureStore.putString(KEY_TENANT_SLUG, value)
        }

    var userName: String?
        get() = secureStore.getString(KEY_USER_NAME)
        set(value) {
            if (value == null) secureStore.remove(KEY_USER_NAME)
            else secureStore.putString(KEY_USER_NAME, value)
        }

    var userEmail: String?
        get() = secureStore.getString(KEY_USER_EMAIL)
        set(value) {
            if (value == null) secureStore.remove(KEY_USER_EMAIL)
            else secureStore.putString(KEY_USER_EMAIL, value)
        }

    fun clear() {
        accessToken = null
        tenantSlug = null
        userName = null
        userEmail = null
    }

    fun hasToken(): Boolean = !accessToken.isNullOrBlank()

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_TENANT_SLUG = "tenant_slug"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_EMAIL = "user_email"
    }
}
